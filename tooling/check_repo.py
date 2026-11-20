"""Check staged file names and indexed text using only Git and Python."""
from pathlib import PurePosixPath
import subprocess
import sys


def git(*args):
    return subprocess.run(["git", *args], check=True, stdout=subprocess.PIPE).stdout


def main():
    paths = git("ls-files", "-z").decode("utf-8").split("\0")
    errors = []
    for path in filter(None, paths):
        p = PurePosixPath(path)
        local_env = (p.name == ".env" or p.name.startswith(".env.")) and p.name != ".env.example"
        if local_env or p.suffix.lower() in {".pfx", ".p12", ".key"}:
            errors.append(f"{path}: local credential file")
        if set(p.parts) & {".venv", "node_modules", ".worktrees", "__pycache__"}:
            errors.append(f"{path}: local dependency or cache")
    # git grep skips binary files with -I; report file names only.
    markers = subprocess.run(
        ["git", "grep", "--cached", "-I", "-l", "-E",
         "-e", "^([<]{7} |[>]{7} )",
         "-e", "^-{5}BEGIN ([[:alnum:] ]+ )?PRIVATE KEY-{5}", "--"],
        stdout=subprocess.PIPE, check=False,
    )
    if markers.returncode not in (0, 1):
        return markers.returncode
    for name in markers.stdout.decode("utf-8").splitlines():
        errors.append(f"{name}: conflict marker or private key header")
    for error in errors:
        print(error, file=sys.stderr)
    if not errors:
        print("Repository checks passed.")
    return int(bool(errors))


if __name__ == "__main__":
    sys.exit(main())

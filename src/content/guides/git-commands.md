---
title: 'Git Commands I Always Forget'
description: 'Quick reference for git commands that I can never remember.'
pubDate: 2026-05-29
topic: git
tags: [git, cli, cheatsheet]
---

## Undoing Things

```bash
# Undo last commit but keep changes staged
git reset --soft HEAD~1

# Undo last commit and unstage changes
git reset HEAD~1

# Completely discard last commit
git reset --hard HEAD~1

# Undo a pushed commit (creates a new commit)
git revert <commit-hash>
```

## Branches

```bash
# Delete local branch
git branch -d branch-name

# Delete remote branch
git push origin --delete branch-name

# Rename current branch
git branch -m new-name

# List branches sorted by last commit
git branch --sort=-committerdate
```

## Stashing

```bash
# Stash with a message
git stash push -m "work in progress on feature X"

# List stashes
git stash list

# Apply specific stash (keep it in stash list)
git stash apply stash@{2}

# Pop specific stash (remove from stash list)
git stash pop stash@{2}

# Stash only unstaged changes
git stash push --keep-index
```

## Log & History

```bash
# Pretty one-line log
git log --oneline --graph --decorate

# Search commits by message
git log --grep="search term"

# Show what changed in a file over time
git log -p -- path/to/file

# Find who changed a line
git blame path/to/file
```

## Cherry-picking

```bash
# Apply a commit from another branch
git cherry-pick <commit-hash>

# Cherry-pick without committing
git cherry-pick --no-commit <commit-hash>
```

## Ignoring Already Committed Files

```bash
# Option 1: Remove a specific file from tracking
# 1. Add the file to .gitignore
# 2. Remove it from the index (keeps the local copy)
git rm --cached path/to/file

# Option 2: Re-apply .gitignore to the entire repo (slow on large repos!)
# 1. Edit .gitignore as needed
# 2. Remove all files from the index
git rm -r --cached .
# 3. Re-add everything (respects the updated .gitignore)
git add .
# 4. Commit the changes
git commit -m "Re-apply .gitignore"
```

## .gitignore: Ignore a Folder Except Specific Files

> Source: [StackOverflow](https://stackoverflow.com/a/16318111)

The `/*` suffix is required — without it, the negation won't work. You also need to un-ignore each intermediate folder in the path.

```ini
# Ignore everything in pippo/ except pippo/pluto/paperino.xml
pippo/*
!pippo/pluto
pippo/pluto/*
!pippo/pluto/paperino.xml
```

**Why this doesn't work:**

```ini
# WRONG: intermediary folder "pluto" is ignored, so the file can't exist
pippo/*
!pippo/pluto/paperino.xml
```

**Another gotcha** — `folder` vs `folder/*`:

```ini
# WRONG: folder itself is ignored, negation has no effect
folder
!folder/some-file.txt

# CORRECT: ignore folder contents, then exclude the file
folder/*
!folder/some-file.txt
```

## Cleanup

```bash
# Remove untracked files (dry run first!)
git clean -n
git clean -fd

# Prune remote tracking branches
git fetch --prune
```

## Worktrees

Work on multiple branches simultaneously without stashing or switching.

```bash
# Create a worktree for a branch in a new directory
git worktree add ../my-feature feature-branch

# Create a worktree with a new branch
git worktree add -b new-branch ../new-branch

# List all worktrees
git worktree list

# Remove a worktree (delete the directory first)
git worktree remove ../my-feature

# Prune stale worktree references
git worktree prune
```

Worktrees share the same `.git` data — no extra clones, no duplicate history. Great for reviewing PRs while keeping your current work untouched.

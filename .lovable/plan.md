

# Fix: SelectItem empty string value in ProjectCollaborators

## Problem
Line 148 of `ProjectCollaborators.tsx` has `<SelectItem value="">Aucun</SelectItem>` which crashes Radix UI Select (empty string not allowed).

## Fix
Same pattern already used in `ProjectForm.tsx`:
- Change `<SelectItem value="">` to `<SelectItem value="none">`
- Change `Select value={responsableUserId ?? ""}` to `value={responsableUserId || "none"}`
- In `handleChangeResponsable`, map `"none"` back to `null`

## File
`src/components/projects/ProjectCollaborators.tsx` — lines 145-148


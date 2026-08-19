Small Gaps Closeout -- Cumulative Log

This is the running, growing record for the "close out all remaining
small gaps before starting a bigger phase" effort. Each fix in this
sequence gets logged here as a new round below, never a fresh
standalone README -- this document does not get reset or replaced with
a narrower one when the topic changes between rounds.

===============================================================================
ROUND 1 -- PHARMACY PRINT TEMPLATES: REAL FACILITY NAME
===============================================================================

## The gap (from PROJECT_BRIEF.md Known Fragile Points)
pharmacy/inventory-counts/print.ejs and pharmacy/reports/print.ejs both
hardcoded "Oseel Care" instead of a real facility name. This was
originally correct -- pharmacy stock wasn't unit-scoped when these
were built, so there was no facility concept to show. That reasoning
stopped holding once Pharmacy Scoping (Phase 3) shipped, but the
templates were never revisited.

## Approach
Deliberately did NOT swap in the shared documentHeader.ejs partial
directly, unlike the warehouse print templates that already use it --
these two documents have their own custom header CSS/layout, and
replacing the whole structure risked a visual mismatch for a
comparatively small gain. Instead, matched documentHeader's own
fallback pattern (real facility name, falls back to "Oseel Care" if
none) but kept each document's existing layout intact -- a smaller,
more targeted fix, consistent with this project's stated preference
for minimal-scope fixes over rebuilds.

## Fixed

**pharmacy/inventory-counts/print.ejs**
- controllers/pharmacyInventoryCountController.js's printCountSheet now
  fetches facility via getCurrentFacilityDetails(req) (the same helper
  warehouse's own print flow uses) and passes it to the view.
- The view's hardcoded "Oseel Care" replaced with the real facility
  name, plus its address/city on a new line if available.
- Left alone, deliberately: a second "Oseel Care HMIS" mention in the
  document's footer watermark -- that's the software product name, not
  facility branding, and isn't part of this gap.

**pharmacy/reports/print.ejs**
- controllers/pharmacyController.js's report-rendering function serves
  both the normal reports page and its print view from the same render
  call. facility is now fetched conditionally -- only when print=true
  -- so the normal reports page doesn't take on an unnecessary query.
- Both the <title> and the visible <h1> now show the real facility
  name instead of the hardcoded text.

## Verified
- node --check clean on both modified controllers.
- EJS tag balance confirmed on both modified views.
- Full project-wide node --check: clean.
- Confirmed the non-print pharmacy/reports.ejs view doesn't reference
  the new facility key at all -- the extra data passed to it is simply
  unused, not a breaking change.

## Documentation
PROJECT_BRIEF.md updated in the same delivery: removed the resolved
Known Fragile Points entry, added §4 fix 46 with full detail.

===============================================================================
ROUND 2 -- PHARMACY UNIT NEVER DISPLAYED ANYWHERE IN THE APP
===============================================================================

## The question raised
"Is the dispensing part not tied to a facility pharmacy, or is this
something I missed?" -- prompted a full re-check of every dispensing
function's facility/unit scoping before concluding anything.

## Investigation, not just a guess
Checked all 4 dispensing-related functions in pharmacyController.js
individually:
- dispenseItem -- correctly scoped: requires a pharmacy unit
  (requirePharmacyUnit), checks the bill item's facility
  (hasEncounterFacilityAccess), and deducts from
  care_pharmacy_stock filtered to the session's specific unit.
- dispenseAll -- same pattern, same correctness, wrapped in a
  transaction.
- dispenseBill -- checks facility access on the bill, shows stock from
  the session's specific unit.
- dispensingQueue -- deliberately facility-wide, not unit-filtered,
  per the confirmed §2.7 design in MULTI_FACILITY_IMPLEMENTATION_PLAN.md
  ("any pharmacy staff at a dual-unit facility sees every pending
  prescription for the whole facility... and dispenses from whatever
  unit they're currently working in") -- this is intentional, not a
  bug. The stock number shown per row is still unit-specific.

Conclusion: the backend scoping is correct across all 4 functions. The
actual gap is different -- the current pharmacy unit (Day/Night) is
never displayed anywhere in the app's UI, not on the dispensing pages
and not even in the navbar (which does show the facility name).
Checked both dispensing views directly (grep for "facility"/"unit" --
zero matches in either), then checked the navbar, which shows facility
but not pharmacy unit at all.

## Fixed
views/partials/navbar.ejs -- added the pharmacy unit name next to the
facility name, using the same conditional-display pattern already
established there (silent when not applicable, e.g. non-pharmacy staff
or single-unit facilities, rather than showing an empty badge). Since
the navbar is included on every page, this fixes visibility globally,
not just on the two dispensing-specific pages that prompted the
question.

## Verified
- Confirmed req.user.pharmacyUnit's exact shape in authMiddleware.js
  (null or {id, name}) before writing the display logic.
- Confirmed via res.locals.user that this is automatically available
  in every view, not something that needed passing through manually
  everywhere.
- Traced the full chain on both dispensing pages specifically:
  controller passes user to the view, view passes it to the navbar
  include, navbar now displays the unit -- checked each link rather
  than assumed.
- EJS tag balance confirmed on navbar.ejs (229/229).
- Full project-wide node --check: clean.

===============================================================================
REMAINING IN THIS EFFORT
===============================================================================
- PHARMACY_MODULE_CHECKLIST.md review pass -- still describes the
  pre-scoping architecture, hasn't been touched yet.
- The broader table-light/table-dark and container-fluid/content-wrapper
  inconsistencies (13 and 4 files respectively, per the earlier fresh
  scan) -- scope not yet verified; unclear how many are real gaps vs.
  legitimate exceptions (e.g. embedded dashboard widgets vs. full
  listing pages). Not yet started.

Next round, whatever it is, gets added below this line -- this
document does not get replaced with a narrower one again.

# CSV Import Process

## Requirements
* Supports up to 5,000 records per upload batch.
* CSV Columns expected (but flexibly mapped):
   * `firstName`
   * `lastName`
   * `email`
   * `phone`
   * `source`

## Validation
* Zod validates emails and lengths.
* A record MUST have at least an email, a phone, or a full name. Missing these causes the record to be `skipped`.

## Duplicates
* Duplicate matching checks the email or phone against existing Contacts in the organization.
* If a match is found, a new Lead is created under the existing Contact. We do not currently overwrite Contact information to prevent accidental data loss.

## Limits and Failures
* Max 5,000 records.
* Imports happen synchronously for now to handle simple sets.
* Detailed stats are logged to `ImportJob`.

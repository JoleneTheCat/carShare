-- Diagnostic: check whether crypt('1234', passcode_hash) reproduces the stored hash for Anat
select
  name,
  passcode_hash,
  crypt('1234', passcode_hash) as computed_hash,
  crypt('1234', passcode_hash) = passcode_hash as matches
from public.users
where name = 'Anat';

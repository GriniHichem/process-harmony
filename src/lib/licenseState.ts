// Shared license read-only flag — set by LicenseContext, read by AuthContext
let _licenseReadOnly = false;

export function setLicenseReadOnly(val: boolean) {
  _licenseReadOnly = val;
}

export function isLicenseReadOnly(): boolean {
  return _licenseReadOnly;
}

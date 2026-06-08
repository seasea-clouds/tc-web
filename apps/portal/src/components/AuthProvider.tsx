'use client';

/**
 * Re-export shared AuthProvider and useAuth from @trade/ui.
 * Using the shared version directly ensures consistent AuthContext
 * singleton across all three sites (site / portal / blog).
 */
export { AuthProvider, useAuth } from '@trade/ui';

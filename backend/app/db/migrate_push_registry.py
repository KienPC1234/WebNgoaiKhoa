"""
DEPRECATED: This migration was for the old FCM token-based system.
The new native Web Push system uses endpoint + p256dh + auth.
Old FCM tokens have been dropped in the clean-break migration.

See: migrations/20260505_native_webpush_schema.sql
"""

print("This migration is deprecated. Old FCM tokens are no longer compatible with the new Web Push system.")
print("Users will need to re-subscribe to push notifications when they visit the site.")

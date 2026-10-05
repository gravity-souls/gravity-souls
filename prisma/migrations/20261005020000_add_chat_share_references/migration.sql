-- Additive references; do not snapshot titles/avatars or delete messages with targets.
ALTER TABLE "direct_message" ADD COLUMN "shareKind" TEXT, ADD COLUMN "shareTargetId" TEXT;
ALTER TABLE "direct_message" ADD CONSTRAINT "direct_message_share_shape" CHECK (
  ("shareKind" IS NULL AND "shareTargetId" IS NULL AND "type" <> 'share') OR
  ("type" = 'share' AND "content" = '' AND "shareKind" IS NOT NULL AND "shareKind" IN ('planet','galaxy','event') AND "shareTargetId" IS NOT NULL AND length("shareTargetId") > 0)
);

# Storage layout

AI Creative Studio uses two public-read buckets. All uploads and deletions run through server-only code using the Supabase secret key, so browser users cannot modify stored files.

## `source-assets`

Stores durable copies of the brand logo and product images discovered during research.

```text
brands/{brand_id}/logo/{asset_id}.{ext}
products/{product_id}/source/{asset_id}.{ext}
```

Maximum file size: 15 MB. Allowed formats: JPEG, PNG, WebP, and AVIF.

## `ad-creatives`

Stores generated visual backgrounds and final 9:16 composites.

```text
campaigns/{campaign_id}/creatives/{creative_id}/background.{ext}
campaigns/{campaign_id}/creatives/{creative_id}/final.{ext}
```

Maximum file size: 25 MB. Allowed formats: JPEG, PNG, WebP, and AVIF.

The database `assets` row records the original remote URL, bucket, storage path, dimensions, MIME type, and copy status. A public bucket provides a stable URL for review and the final approved creative. Public access permits reads only; writes still require the server credential because no browser upload policies are defined.

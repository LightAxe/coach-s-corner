# CloudFront standard access logging (v2) for this site's distribution.
#
# This is the *per-distribution delivery wiring* only. The destination is a
# bucket shared by the whole axpr fleet (axpr-cloudfront-logs, us-west-2),
# provisioned and owned by LightAxe/personal-site — this repo does not
# create, modify, or import that bucket or its policy.
#
# "Standard logging v2" is not the legacy `logging_config` block on the
# distribution — it's three CloudWatch Logs resources per distribution:
#
#   delivery source  (the distribution, log type ACCESS_LOGS)
#        |
#     delivery       (record fields + partitioned suffix path)
#        |
#   delivery destination (the shared S3 bucket, w3c output)
#
# All three must be created in us-east-1: CloudFront is a global service and
# CloudWatch only accepts its delivery sources there. That's the same reason
# the ACM cert uses this provider alias, so we reuse it rather than adding
# another one.
#
# Every site in the fleet is deliberately configured identically — one
# log-analyzer format string parses all sites' logs merged together. Do not
# reorder, rename, or add record fields here without updating that analyzer
# (see LightAxe/personal-site, infra/main/cloudfront_logging.tf, the
# reference implementation this file mirrors).

locals {
  # Shared destination bucket for the whole axpr fleet. Owned by
  # LightAxe/personal-site — referenced by ARN only, never managed here.
  cloudfront_logs_destination_arn = "arn:aws:s3:::axpr-cloudfront-logs"

  # This site's distribution, keyed by the site name that prefixes its
  # delivery source/destination. A single-distribution site, but kept as a
  # map (rather than a bare resource) so it matches the fleet-wide pattern
  # and extends the same way if a second distribution is ever added here.
  cloudfront_log_sources = {
    "fasterpack" = aws_cloudfront_distribution.site.arn
  }

  # The w3c fields written to every log line, in order. Cookie logging is
  # intentionally omitted — we don't want cookie values landing in the archive.
  cloudfront_log_record_fields = [
    "date",
    "time",
    "x-edge-location",
    "sc-bytes",
    "c-ip",
    "cs-method",
    "cs(Host)",
    "cs-uri-stem",
    "sc-status",
    "cs(Referer)",
    "cs(User-Agent)",
    "cs-uri-query",
    "x-edge-result-type",
    "x-host-header",
    "cs-protocol",
    "cs-bytes",
    "time-taken",
    "x-forwarded-for",
    "sc-content-type",
    "c-country",
    "asn",
    "cache-behavior-path-pattern",
  ]
}

# A distribution can have exactly one delivery source, so the name is stable
# per site rather than derived from anything that might churn.
resource "aws_cloudwatch_log_delivery_source" "cloudfront" {
  for_each = local.cloudfront_log_sources
  provider = aws.us_east_1

  name         = "${each.key}-cf-logs"
  log_type     = "ACCESS_LOGS"
  resource_arn = each.value
}

# Output format is fixed at creation — changing it later requires destroying
# and recreating both the destination and the delivery that references it.
resource "aws_cloudwatch_log_delivery_destination" "cloudfront" {
  for_each = local.cloudfront_log_sources
  provider = aws.us_east_1

  name          = "${each.key}-cf-logs"
  output_format = "w3c"

  delivery_destination_configuration {
    destination_resource_arn = local.cloudfront_logs_destination_arn
  }
}

# Links source to destination and carries the per-delivery output config.
# No depends_on on the bucket policy here — that policy lives in
# LightAxe/personal-site and already admits any delivery source in this
# account, so there's nothing in this repo's graph to order against.
resource "aws_cloudwatch_log_delivery" "cloudfront" {
  for_each = local.cloudfront_log_sources
  provider = aws.us_east_1

  delivery_source_name     = aws_cloudwatch_log_delivery_source.cloudfront[each.key].name
  delivery_destination_arn = aws_cloudwatch_log_delivery_destination.cloudfront[each.key].arn
  record_fields            = local.cloudfront_log_record_fields

  # field_delimiter is intentionally unset: the AWS default for w3c is a tab,
  # which is what the fleet's analyzer expects.

  s3_delivery_configuration {
    # AWS may root this under AWSLogs/<account-id>/CloudFront/, which is fine —
    # the distribution ID stays the first component we control, so a single
    # recursive prefix scan per distribution still works.
    suffix_path = "{DistributionId}/{yyyy}/{MM}/{dd}"

    # Hive-style (key=value) partition names would break the shared analyzer.
    enable_hive_compatible_path = false
  }
}


locals {
   # Automatically load environment-level variables
   environment_vars = read_terragrunt_config(find_in_parent_folders("env.hcl"))
   region_vars = read_terragrunt_config(find_in_parent_folders("region.hcl"))   
   # Extract out common variables for reuse
   env        = local.environment_vars.locals.environment
   project    = local.environment_vars.locals.project
   aws_region = local.region_vars.locals.aws_region
}

terraform {
   source = "git::git@github.com:terraform-aws-modules/terraform-aws-sqs.git//.?ref=v3.5.0"
}

inputs = {
  name = "test-push-activity"
  receive_wait_time_seconds = 20
  visibility_timeout_seconds = 300
  tags = {
    Environment = local.env
    Project     = local.project
    Description = "Managed by Terraform"
  }
  fifo_queue = false
  create_dlq = true
}


include {
  path = find_in_parent_folders()
}

dependencies {
  paths = ["../aws-data"]
}

dependency "aws-data" {
  config_path = "../aws-data"
}
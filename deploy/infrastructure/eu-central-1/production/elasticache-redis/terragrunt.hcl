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
  source = "git::git@github.com:umotif-public/terraform-aws-elasticache-redis.git?ref=1.1.0"
}

###########################################################
# View all available inputs for this module:
# https://registry.terraform.io/modules/terraform-aws-modules/security-group/aws/3.1.0?tab=inputs
###########################################################
inputs = {
 name_prefix           = "${local.env}-${local.project}"
  number_cache_clusters = 1
  node_type             = "cache.t2.micro"

  engine_version           = "5.0.6"
  port                     = 6379
  maintenance_window       = "mon:03:00-mon:04:00"
  snapshot_window          = "04:00-06:00"
  snapshot_retention_limit = 7

  automatic_failover_enabled = true

  at_rest_encryption_enabled = false
  transit_encryption_enabled = false
  #auth_token                 = ""

  apply_immediately = true
  family            = "redis5.0"

  subnet_ids = dependency.vpc.outputs.public_subnets
  vpc_id     = dependency.vpc.outputs.vpc_id

  ingress_cidr_blocks = ["${dependency.vpc.outputs.vpc_cidr_block}"]

  parameter = [
    {
      name  = "repl-backlog-size"
      value = "16384"
    }
  ]

  tags = {
    Project = "${local.project}"
    Env = "${local.env}"
  }
}

include {
  path = find_in_parent_folders()
}

dependencies {
  paths = ["../vpc"]
}

dependency "vpc" {
  config_path = "../vpc"
}
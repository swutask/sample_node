
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
   source = "git::git@github.com:terraform-aws-modules/terraform-aws-rds.git?ref=v2.17.0"
}

# MODULE PARAMETERS
inputs = {
  create_db_instance              = local.environment_vars.locals.rds_create
  create_db_option_group          = false
  create_db_parameter_group       = local.environment_vars.locals.rds_create
  name                            = local.project
  identifier                      = local.env
  engine                          = "postgres"
  engine_version                  = local.environment_vars.locals.engine_version
  database_name                   = local.env
  port                            = 5432
  username                        = "administrator"
  password                        = "Y3DfEA!5!wSk"
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  max_allocated_storage           = 100
  allocated_storage               = 20
  multi_az                        = local.environment_vars.locals.rds_multi_az
  #publicly_accessible             = local.environment_vars.locals.rds_publicly_accessible
  instance_class                  = local.environment_vars.locals.rds_instance_class
  apply_immediately               = true
  backup_retention_period         = local.environment_vars.locals.rds_backup_retention_period
  maintenance_window              = "Mon:00:00-Mon:03:00"
  backup_window                   = "07:00-09:00"
  skip_final_snapshot             = local.environment_vars.locals.rds_skip_final_snapshot
  db_subnet_group_name            = dependency.vpc.outputs.database_subnet_group
  create_security_group           = true
  vpc_security_group_ids          = [dependency.sg-rds.outputs.this_security_group_id]
  # DB option group
  major_engine_version            = "12"
  family                          = "postgres12"
  subnet_ids                      = flatten([dependency.vpc.outputs.public_subnets])
  final_snapshot_identifier       = "${local.env}"
  deletion_protection             = local.environment_vars.locals.rds_deletion_protection
  tags = {
    Environment = local.env
    Project     = local.project
  }
}

dependency "vpc" {
  config_path = "../vpc"
}

dependency "sg-rds" {
  config_path = "../sg-rds"
}

dependency "aws-data" {
  config_path = "../aws-data"
}


dependencies {
  paths = ["../vpc", "../sg-rds", "../aws-data"]
}

include {
  path = find_in_parent_folders()
}
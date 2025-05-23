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
  source = "${get_parent_terragrunt_dir()}//infrastructure/modules/ecs-task"
}

inputs = {
  log_group_name         = "${local.environment_vars.locals.project}-${local.environment_vars.locals.environment}-migration"
  app_name               = "${local.environment_vars.locals.project}-${local.environment_vars.locals.environment}-migration"
  node_env               = local.environment_vars.locals.environment
  role_arn               = "arn:aws:iam::944000130876:role/ecs/helloivy-production-ec2-instance-role"
  aws_region             = local.region_vars.locals.aws_region
  cluster_arn            = "arn:aws:ecs:eu-central-1:944000130876:cluster/helloivy-production"
  image                  = dependency.ecr.outputs.repository_url
  capacity_provider_name = "cp-production"
  command                = "node src/migrate.js"
  memory                 = 256
}


include {
  path = find_in_parent_folders()
}

dependencies {
  paths = ["../ecr" ]
}


dependency "ecr" {
  config_path = "../ecr"
}

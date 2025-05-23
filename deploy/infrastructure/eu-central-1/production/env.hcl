# Set common variables for the environment. This is automatically pulled in in the root terragrunt.hcl configuration to
# feed forward to the child modules.
locals {
  environment                 = "production"              
  project                     = "complex"  // project name
  // Aplication Load Balancer
  back_end_port               = 3001                // for health checks and ALB
  alb_allowed_ips_cird        = "0.0.0.0/0"         // allow IPs for Load Balancer
  health_path                 = "/api/health"                 // health check path
  // Auto Scaling Group    
  instance_type               = "t3.small"//"c5.large" 
  spot_price                  = "0.024"   
  volume_size                 = "30"
  ssh_allowed_cird            = ["0.0.0.0/0"] 
  public_key_location         = "~/.ssh/production-helloivy.pub" // path to ssh key
  max_cpu_percent             = 70
  period_seconds              = 60
  min_size                    = 2
  max_size                    = 8
  // Elastic cashe (Redis)    
  redis_instance_type         = "cache.t2.micro"
  redis_cluster_size          = 1
  redis_engine_version        = "5.0.4"
  redis_family                = "redis5.0"
  // RDS (Postgres)    
  rds_create                  = true
  engine_version              = "12.3"
  rds_instance_class          = "db.t3.micro"
  rds_backup_retention_period = 5
  rds_multi_az                = true
  rds_skip_final_snapshot     = false
  rds_deletion_protection     = true
  rds_publicly_accessible     = false
}
variable "log_group_name" {
    type = string
    description = "(optional) describe your variable"
}

variable "app_name" {
    type = string
    description = "(optional) describe your variable"
}

variable "node_env" {
    type = string
    description = "NODE_ENV variable for container"
}
variable "image" {
    type = string
    description = "(optional) describe your variable"
}

variable "aws_region" {
    type = string
    description = "(optional) describe your variable"
}

variable "cluster_id" {
    type = string
    description = "(optional) describe your variable"
}

variable "cluster_arn" {
    type = string
    description = "(optional) describe your variable"
}

variable "desired_count" {
    type = number
    description = "(optional) describe your variable"
}
variable "back_end_port" {
  type = number
}

variable "health_check_path" {
  type = string
}


variable "role_arn" {
  type = string
}

variable "alb_target_group" {
  type = string
}

variable "min_size" {
  type = number
}

variable "max_size" {
  type = number
}

variable "capacity_provider_name" {
  type = string
}

variable "cluster_name" {
  type = string
}

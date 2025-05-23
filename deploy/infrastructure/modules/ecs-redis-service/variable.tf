variable "log_group_name" {
    type = string
    description = "(optional) describe your variable"
}

variable "app_name" {
    type = string
    description = "(optional) describe your variable"
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

variable "role_arn" {
  type = string
}

variable "capacity_provider_name" {
  type = string
}

variable "cluster_name" {
  type = string
}

variable "vpc_id" {
  type = string
  description = "for AWS Cloud Map"
}
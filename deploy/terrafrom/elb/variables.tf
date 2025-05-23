variable "region" {
  description = "AWS Region to deploy Server"
  default     = "eu-central-1"
}

variable "elb_ports" {
  description = "List of Ports to open for ELB"
  default     = ["80", "443"]
}

variable "node_port" {
  description = "Backend port"
  default     = "3001"
}


variable "enable_detailed_monitoring" {
  default = false
}

variable "main_domain" {
  description = "Main domain"
  default     = "helloivy.co"
}

variable "common_tags" {
  description = "Common Tags to apply to all resources"
  default = {
    Owner       = "Administrator"
    Project     = "helloivy"
    Environment = "test"
  }
}

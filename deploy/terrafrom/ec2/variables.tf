variable "region" {
  description = "AWS Region to deploy Server"
  default     = "eu-central-1"
}

variable "instance_type" {
  description = "Instance Type"
  default     = "t3.micro"
}


variable "node_port" {
  description = "Backend port"
  default     = "3001"
}

variable "ssh_port" {
  description = "SSH port"
  default     = "22"
}

variable "ssh_key" {
  description = "Public SSH key"
  default     = "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDNV6nVKc/QjzJL96wWS3XX0UNPA74yaCVBqXADpfeLk31cyHMw7qrfgkNDfhzHm3nzZcpuD0JBQWWoQl2/oiNjoH/CaDgBPjEOkPVwSIfZ84Srf/ia3vDIXdhdtFVjjW9XKjS3Jil5+xsCi/cMvChoj0iSN5w1jibF6sfl/85l2aqaFMokx3Oe6Kq6HOQzG4CxlV9Z7fwuuVE1DOsTtIewBK0s2JwcC+sq/CGReHMlhYa0F3wmOkL9hxV12xLK9X70vVNTLPA7mQNeVH759NrMFh9ah5hhjarX9honMxl1uE/sE27z0rvT57FIO9KbFQ0sTEALHURr/YhEuiNzUb03Z2UoJU5kCK4HsJZ1zdOEFxygy9fbl+pivr0+aPLJsZuSUeUjnx/lfjqVEltxbRSpFacGSZSJ9ZcwNNuW49NdBnAGUIr6jxIbe5eRkLq9H6yWt3sKX8v1sCCXMm9Msfbt00i22aoDDDnZ4vMIzaSXYJqMNSvlx4R2KshkxkAlTOVLCcqqiGzamFV3EwXqbop1g8jEVmQHlDqWgfm4ebLyNKsJirH18KLwZIIW3iPzLdF7Cf1Cd/dR7/kidDdwPv235InMAJbgNtx2dW1qfgZiQmf0QKHNybrsR113yGxElyUqcZpx0b6p+kFcecmwY/tn4Kgn9CbSf/edlmvMHxss5w=="
}

variable "enable_detailed_monitoring" {
  default = false
}


variable "common_tags" {
  description = "Common Tags to apply to all resources"
  default = {
    Owner       = "Administrator"
    Project     = "helloivy"
    Environment = "test"
  }
}

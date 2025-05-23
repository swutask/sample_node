data "template_file" "user_data" {
  template = file("user-data.sh")
}

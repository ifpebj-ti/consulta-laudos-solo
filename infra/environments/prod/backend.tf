terraform {
  backend "s3" {
    bucket = "consulta-laudos-solos-tfstate-bu"
    key    = "prod/terraform.tfstate"
    region = "us-east-1"
  }
}
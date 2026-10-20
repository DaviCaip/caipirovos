-- Create tables for Caipirovos landing page

-- Table for producers who want to sell their eggs through Caipirovos
CREATE TABLE IF NOT EXISTS producers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL,
  farm_name VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  production_capacity INTEGER NOT NULL,
  experience_years INTEGER,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for resellers who want to sell Caipirovos eggs
CREATE TABLE IF NOT EXISTS resellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL,
  business_type VARCHAR(100) NOT NULL, -- mercadinho, padaria, supermercado, etc
  address VARCHAR(500) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(50) NOT NULL,
  estimated_monthly_demand INTEGER,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE producers ENABLE ROW LEVEL SECURITY;
ALTER TABLE resellers ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since these are contact forms)
-- Anyone can insert (submit forms)
CREATE POLICY "Anyone can submit producer applications" ON producers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can submit reseller applications" ON resellers
  FOR INSERT WITH CHECK (true);

-- Only authenticated users can view (for admin purposes)
CREATE POLICY "Only authenticated users can view producers" ON producers
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only authenticated users can view resellers" ON resellers
  FOR SELECT USING (auth.role() = 'authenticated');

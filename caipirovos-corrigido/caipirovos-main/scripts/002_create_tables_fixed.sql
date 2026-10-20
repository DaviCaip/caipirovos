-- Create resellers table
CREATE TABLE IF NOT EXISTS public.resellers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    business_type VARCHAR(100),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(10),
    estimated_monthly_demand INTEGER DEFAULT 0,
    message TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create producers table
CREATE TABLE IF NOT EXISTS public.producers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    farm_name VARCHAR(255) NOT NULL,
    location TEXT,
    production_capacity INTEGER DEFAULT 0,
    experience_years INTEGER DEFAULT 0,
    message TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.resellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.producers ENABLE ROW LEVEL SECURITY;

-- Create policies to allow inserts from authenticated users
CREATE POLICY "Allow public inserts on resellers" ON public.resellers
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public inserts on producers" ON public.producers
    FOR INSERT WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_resellers_email ON public.resellers(email);
CREATE INDEX IF NOT EXISTS idx_resellers_created_at ON public.resellers(created_at);
CREATE INDEX IF NOT EXISTS idx_producers_email ON public.producers(email);
CREATE INDEX IF NOT EXISTS idx_producers_created_at ON public.producers(created_at);

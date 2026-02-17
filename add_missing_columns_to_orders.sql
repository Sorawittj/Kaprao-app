-- Add missing columns to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS customer_name text,
ADD COLUMN IF NOT EXISTS payment_method text,
ADD COLUMN IF NOT EXISTS payment_status text;

-- Add comments for clarity
COMMENT ON COLUMN public.orders.customer_name IS 'Name of the customer placing the order';
COMMENT ON COLUMN public.orders.payment_method IS 'Payment method (e.g., promptpay, cod)';
COMMENT ON COLUMN public.orders.payment_status IS 'Payment status (e.g., paid_verify, pending)';

-- Create at_risk_dismissals table to track dismissed at-risk users
CREATE TABLE IF NOT EXISTS at_risk_dismissals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    dismissed_by UUID NOT NULL REFERENCES profiles(id),
    dismissed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reason TEXT,
    UNIQUE(business_id)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_at_risk_dismissals_business_id ON at_risk_dismissals(business_id);
CREATE INDEX IF NOT EXISTS idx_at_risk_dismissals_dismissed_at ON at_risk_dismissals(dismissed_at);

-- Enable RLS
ALTER TABLE at_risk_dismissals ENABLE ROW LEVEL SECURITY;

-- Policy: Only super admins can view dismissals
CREATE POLICY "Super admins can view all dismissals"
    ON at_risk_dismissals
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'super_admin'
        )
    );

-- Policy: Only super admins can insert dismissals
CREATE POLICY "Super admins can insert dismissals"
    ON at_risk_dismissals
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'super_admin'
        )
    );

-- Policy: Only super admins can delete dismissals (un-dismiss)
CREATE POLICY "Super admins can delete dismissals"
    ON at_risk_dismissals
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'super_admin'
        )
    );

-- Traffic Guardian Database Schema

-- Drop schema if it exists (with cascade to remove all objects in it)
DROP SCHEMA IF EXISTS "TrafficGuardian" CASCADE;

-- Create TrafficGuardian Schema
CREATE SCHEMA "TrafficGuardian";

-- Users Table
CREATE TABLE IF NOT EXISTS "TrafficGuardian"."Users" (
    "User_ID" SERIAL PRIMARY KEY,
    "User_Username" VARCHAR(100) NOT NULL UNIQUE,
    "User_Password" VARCHAR(255) NOT NULL,
    "User_CarID" INTEGER,
    "User_Email" VARCHAR(30) NOT NULL UNIQUE,
    "User_Role" VARCHAR(5) NOT NULL DEFAULT 'user',
    "User_Preferences" JSONB DEFAULT '{}',
    "User_APIKey" VARCHAR(15) NOT NULL UNIQUE
);

-- Incidents Table
CREATE TABLE IF NOT EXISTS "TrafficGuardian"."Incidents" (
    "Incident_ID" SERIAL PRIMARY KEY,
    "Incident_Date" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "Incident_Location" TEXT NOT NULL,
    "Incident_CarID" INTEGER,
    "Incident_Severity" VARCHAR(50) CHECK ("Incident_Severity" IN ('low', 'medium', 'high', 'critical')),
    "Incident_Status" VARCHAR(50) DEFAULT 'open',
    "Incident_Reporter" INTEGER REFERENCES "TrafficGuardian"."Users"("User_ID")
);

-- Alerts Table
CREATE TABLE IF NOT EXISTS "TrafficGuardian"."Alerts" (
    "Alert_ID" SERIAL PRIMARY KEY NOT NULL,
    "Alert_IncidentID" INTEGER REFERENCES "TrafficGuardian"."Incidents"("Incident_ID") NOT NULL,
    "Alert_Message" TEXT,
    "Alert_Type" VARCHAR(50) DEFAULT 'notification' NOT NULL,
    "Alert_Severity" VARCHAR(20) NOT NULL,
    "Alert_Recipients" INTEGER[],
    "Alert_Status" VARCHAR(20) DEFAULT 'pending'
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON "TrafficGuardian"."Users"("User_Email");
CREATE INDEX IF NOT EXISTS idx_incidents_status ON "TrafficGuardian"."Incidents"("Incident_Status");
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON "TrafficGuardian"."Incidents"("Incident_Severity");
CREATE INDEX IF NOT EXISTS idx_alerts_status ON "TrafficGuardian"."Alerts"("Alert_Status");

# Angel Montessori System Architecture

## Purpose

This document describes the intended long-term architecture for the Angel Montessori School platform, including:

- the public website
- the internal portal
- applicant access
- public CBT access
- core academic and operational modules

## Domain Structure

```text
Public Website: angelmontessori.com
Internal Portal: portal.angelmontessori.com
```

## High-Level Split

```text
angelmontessori.com
├── Public website
├── Admissions pages
├── Applicant login and application flow
└── Public CBT access for entrance and interview candidates

portal.angelmontessori.com
├── Student portal
├── Parent portal
├── Teacher portal
├── Admin and staff portal
└── Internal academic and operational systems
```

## Public Website Modules

```text
angelmontessori.com
├── Home
├── About
├── Academics
├── Student Life
├── Admissions
├── Careers
├── Enrichment
├── Information
├── Contact
├── Admissions Applicant Login
└── Public CBT Exam Login
```

## Portal Modules

```text
portal.angelmontessori.com
├── Portal Home
├── Student Portal
├── Parent Portal
├── Teacher Portal
├── Admin and Staff Portal
├── LMS
├── CBT Management
├── Attendance
├── Results and Broadsheets
├── Payments
├── Transport
├── Academic Calendar Management
├── Scheme of Work
└── Lesson Notes
```

## Applicant and External Candidate Access

Applicants and external candidates should remain on the main domain because they are not yet internal portal users.

```text
angelmontessori.com
├── /admissions/register
├── /admissions/login
├── /applicant/*
└── /cbt/exam
```

This allows:

- applicants to continue admissions on the public-facing domain
- entrance candidates to access CBT without entering the internal portal
- interview candidates to access CBT without entering the internal portal

## Internal User Access

Internal authenticated users should use the portal subdomain:

```text
portal.angelmontessori.com
├── /login
├── /portal
├── /student/*
├── /parent/*
├── /teacher/*
├── /admin/*
└── /dashboard/*
```

## Core School Systems

### Academic Control

```text
Academic Calendar
├── Sessions
├── Terms
├── Events
├── Preview
├── Publish
└── Archive

Scheme of Work
├── Sessions
├── Schemes
├── Weekly Entries
├── Approvals
├── Progress Tracking
└── Export

Lesson Notes
├── Notes
├── Reviews
└── Export
```

### Learning Systems

```text
LMS
├── Lessons
├── Assignments
├── Quizzes
├── Announcements
├── Reports
└── Virtual Classes

CBT
├── Student exams
├── Entrance exams
├── Interview tests
├── Question bank
└── Results
```

### Operations

```text
Operations
├── Payments
├── Transport
├── Enquiries
├── Careers
├── User Management
└── SMS and notifications
```

## Current Code Direction

The frontend is already prepared for this split through:

- host-aware routing
- domain-aware public and portal links
- a separate applicant login flow
- production environment examples for main and portal domains

## Recommended Hosting Shape

At launch, both domains can point to the same server, as long as:

- DNS is configured for both domains
- SSL is installed for both domains
- the backend allows both origins
- the frontend production environment knows both hostnames

## Key Principle

```text
Main domain = public-facing school experience
Portal subdomain = secure school operations and logged-in users
```


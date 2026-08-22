# Angel Montessori Role Access Matrix

## Purpose

This document defines who should access which part of the Angel Montessori platform.

It is intended to guide:

- route protection
- dashboard visibility
- module permissions
- future approval workflows

## Core Roles

```text
Public Visitor
Applicant
Student
Parent
Teacher
Academic Officer
Admission Officer
Finance Officer
HR Officer
ICT Admin
Transport Admin
Driver
Admin
Super Admin
```

## Access Principles

1. Public visitors should never enter internal portal workflows.
2. Applicants should only access their own admission process.
3. Students should only access their own records and assigned learning tools.
4. Parents should only access their own child or children.
5. Teachers should only edit their own teaching work.
6. Approval and publishing actions should be limited to designated officers and admins.
7. Super Admin should retain full system oversight.

## Role Matrix

| Module / Area | Public Visitor | Applicant | Student | Parent | Teacher | Academic Officer | Admission Officer | Finance Officer | HR Officer | ICT Admin | Transport Admin | Driver | Admin | Super Admin |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Public Website | View | View | View | View | View | View | View | View | View | View | View | View | View | View |
| Applicant Portal | No | Own only | No | No | No | View optional | Full admissions flow | View payments only | No | Support | No | No | Full | Full |
| Student Portal | No | No | Own only | No | No | View optional | No | No | No | Support | No | No | View and manage | Full |
| Parent Portal | No | No | No | Own child only | No | View optional | No | Fee-related view | No | Support | Transport-linked view | No | View and manage | Full |
| Teacher Portal | No | No | No | No | Own workspace | View | No | No | No | Support | No | No | View and manage | Full |
| Admissions Admin | No | Own status only | No | No | No | No | Full | Payment-linked visibility | No | Support | No | No | Full | Full |
| Academic Calendar Public | View | View | View | View | View | View | View | View | View | View | View | View | View | View |
| Academic Calendar Management | No | No | View optional | View optional | View | Full | View | No | No | Support | No | No | Full | Full |
| Scheme of Work | No | No | No | No | Edit assigned only | Approve and monitor | No | No | No | Support | No | No | Full | Full |
| Lesson Notes | No | No | No | No | Edit assigned only | Review and approve | No | No | No | Support | No | No | Full | Full |
| LMS | No | No | Own access | Child view | Teaching access | Monitor | No | No | No | Support | No | No | Full | Full |
| Virtual Classes | No | No | Join assigned | Child view | Manage assigned | Monitor | No | No | No | Support | No | No | Full | Full |
| CBT Student Exams | No | No | Assigned only | Child status only | Manage class-related | Monitor | No | No | No | Support | No | No | Full | Full |
| CBT Entrance Exams | Public access only | Candidate access | No | No | No | View optional | Full process | Payment-linked view | No | Support | No | No | Full | Full |
| CBT Interview Tests | Public access only | No | No | No | No | No | No | No | Full process | Support | No | No | Full | Full |
| Attendance | No | No | Own only | Child only | Record class | Monitor | No | No | No | Support | No | No | Full | Full |
| Report Cards / Broadsheets | No | No | Own only | Child only | Manage assigned | Monitor | No | No | No | Support | No | No | Full | Full |
| Payments | No | Applicant fee only | Limited | View and pay | No | No | View admissions-related | Full | No | Support | No | No | Full | Full |
| Transport | No | No | No | Child transport only | No | No | No | No | No | Support | Full | Own trips only | Full | Full |
| Careers Dashboard | No | No | No | No | No | No | No | No | Full | Support | No | No | Full | Full |
| Enquiries / Visits / Callbacks | Submit only | Submit only | No | Submit only | No | No | Full | View linked items | No | Support | No | No | Full | Full |
| User Management | No | No | No | No | No | No | No | No | No | Support and ops | No | No | Full | Full |
| Account Provisioning | No | No | No | No | No | No | No | No | No | Full | No | No | Full | Full |
| System Configuration | No | No | No | No | No | No | No | No | No | Limited | No | No | Full | Full |

## High-Risk Actions

These should remain tightly restricted.

### Publish and Archive

- Publish academic calendar: `Admin`, `Super Admin`, optionally `Academic Officer`
- Archive academic calendar: `Admin`, `Super Admin`

### Academic Approval

- Approve scheme of work: `Academic Officer`, `Admin`, `Super Admin`
- Approve lesson notes: `Academic Officer`, `Admin`, `Super Admin`

### Account and System Control

- Provision users: `ICT Admin`, `Admin`, `Super Admin`
- Edit global permissions: `Admin`, `Super Admin`

### Financial Control

- Financial adjustments and payment oversight: `Finance Officer`, `Admin`, `Super Admin`

### Recruitment

- Interview test and hiring workflows: `HR Officer`, `Admin`, `Super Admin`

## Recommended Rule of Thumb

```text
Own data -> student, parent, applicant
Assigned work -> teacher
Oversight and approvals -> officers and admin roles
System-wide control -> admin and super admin
```


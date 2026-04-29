# StarVista Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER INTERFACE (HTML)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐         ┌──────────────────────────────┐ │
│  │ Property Table   │         │  Edit Field Modal            │ │
│  ├──────────────────┤         ├──────────────────────────────┤ │
│  │ Room  │Name│...  │         │ ✕   Edit Room Number    ✕  │ │
│  │ 101   │John│...  │◄────►   │ ┌────────────────────────┐  │ │
│  │ 102   │Jane│...  │ Click   │ │ Enter room number  101 │  │ │
│  │       │    │...  │         │ └────────────────────────┘  │ │
│  │       │    │...  │         │  [Cancel] [Confirm Update]  │ │
│  └──────────────────┘         └──────────────────────────────┘ │
│                                                                  │
│  (Editable cells with hover effects and tooltips)               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                               ▲
                               │
                          CSS/Styling
                        (style.css)
                               │
┌─────────────────────────────────────────────────────────────────┐
│              BUSINESS LOGIC (JavaScript - property.js)           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  openEditFieldModal()                                  │    │
│  │  - Detects field type                                  │    │
│  │  - Shows appropriate input                             │    │
│  │  - Sets focus                                          │    │
│  └────────────────────────────────────────────────────────┘    │
│                               ▼                                 │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  validateEditField()                                   │    │
│  │  - Name: not empty                                     │    │
│  │  - Phone: digits only                                  │    │
│  │  - Dates: end >= start                                 │    │
│  │  - Returns error or value                              │    │
│  └────────────────────────────────────────────────────────┘    │
│                               ▼                                 │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  saveEditedField()                                     │    │
│  │  - Calls validateEditField()                           │    │
│  │  - Prepares update object                              │    │
│  │  - Sends to Firebase                                   │    │
│  │  - Shows success toast                                 │    │
│  │  - Refreshes table                                     │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                               ▲
                               │
                        API Calls
                               │
┌─────────────────────────────────────────────────────────────────┐
│            BACKEND (Firebase Firestore)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐                                           │
│  │  Collections     │                                           │
│  ├──────────────────┤                                           │
│  │ properties       │                                           │
│  │  ├─ rooms        │                                           │
│  │  │   ├─ residents│                                           │
│  │  │   │  ├─ name  │                                           │
│  │  │   │  ├─ phone │                                           │
│  │  │   │  ├─ start_date                                        │
│  │  │   │  ├─ end_date                                          │
│  │  │   │  └─ remarks                                           │
│  │  │   └─ room_no  │                                           │
│  │  │               │                                           │
│  └──────────────────┘                                           │
│                                                                  │
│  Real-time updates, Security rules enforced                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

```
User Interaction
│
├─ Click Table Cell
│  │
│  └─► openEditFieldModal(field, roomId, residentId, data, value)
│      │
│      ├─ Determine field type
│      ├─ Show appropriate input form
│      ├─ Pre-fill current value
│      └─ Auto-focus input
│
├─ Edit Value (with real-time hints)
│  │
│  └─► User sees validation hints for this field
│
├─ Click "Confirm Update"
│  │
│  └─► validateEditField()
│      │
│      ├─ Check field constraints
│      │
│      ├─ If invalid:
│      │  └─ Return error → showToast(error) → Exit
│      │
│      └─ If valid:
│         └─ Return value
│
├─ saveEditedField()
│  │
│  ├─ Prepare update object
│  │
│  ├─ Call Firestore update:
│  │  │
│  │  └─► db.collection('properties')
│  │      .collection('rooms')
│  │      .collection('residents')
│  │      .update({ field: value })
│  │
│  ├─ Wait for response
│  │
│  ├─ If success:
│  │  ├─ showToast("Data Updated Successfully")
│  │  ├─ closeEditFieldModal()
│  │  └─ loadPropertyDetail() → Refresh table
│  │
│  └─ If error:
│     └─ showToast(error, 'error')
│
└─ Table Updates
   │
   ├─ Renders new data
   ├─ Recalculates status (PAID/UPCOMING/PENDING)
   ├─ Shows success animation
   └─ Ready for next edit
```

---

## Component Interaction Diagram

```
┌─────────────────────────────────────────────────────┐
│            HTML STRUCTURE                           │
├─────────────────────────────────────────────────────┤
│                                                      │
│  residents-body  ───────┐                           │
│      │                  │ renders                   │
│      ▼                  │                           │
│    <tbody>              │                           │
│      ├─ <tr> (room 1)   │                           │
│      │  └─ <td class="editable-cell">              │
│      │     (Name, Phone, Dates, Remarks)            │
│      │     onclick → openEditFieldModal()            │
│      │                  │                           │
│      └─ <tr> (room 2)   │                           │
│                         │                           │
│  edit-field-modal ◄─────┘                           │
│      │                                              │
│      ├─ edit-field-close                            │
│      ├─ edit-name-field                             │
│      ├─ edit-contact-field                          │
│      ├─ edit-start-date-field                       │
│      ├─ edit-end-date-field                         │
│      ├─ edit-remark-field                           │
│      ├─ edit-room-field                             │
│      ├─ edit-field-confirm    ► saveEditedField()   │
│      └─ edit-field-cancel     ► closeEditFieldModal()
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## State Management Diagram

```
APPLICATION STATE

┌──────────────────────────┐
│  editFieldData {         │
│    field: string,        │◄─── Stores current edit context
│    roomId: string,       │
│    residentId: string,   │
│    residentData: object, │
│    value: any            │
│  }                       │
└──────────────────────────┘
        ▲          │
        │          │
    Set on open    Used on save
        │          ▼
    Updated to:   - Validation
    - "name"      - Firebase update
    - "phone"     - Table refresh
    - "date"      
    - "remarks"
    - "room_no"
```

---

## Event Listener Architecture

```
USER ACTIONS                EVENT LISTENERS             FUNCTIONS
─────────────              ──────────────────          ─────────

Click Cell           ──►   onclick (rendered)    ──►   openEditFieldModal()
                                                      │
                                                      ├─ Show form
                                                      └─ Auto-focus

Click "Confirm"      ──►   click #confirm       ──►   saveEditedField()
                                                      │
                                                      ├─ Validate
                                                      ├─ Update DB
                                                      └─ Refresh

Click "Cancel"       ──►   click #cancel        ──►   closeEditFieldModal()

Click X Button       ──►   click #close         ──►   closeEditFieldModal()

Click Outside Modal  ──►   click on overlay     ──►   closeEditFieldModal()

Type in Remark       ──►   input event          ──►   updateRemarkCount()
```

---

## Validation Flow

```
INPUT VALUE
    │
    ├─── validateEditField()
         │
         ├─ Switch(field type)
         │
         ├─ "name": 
         │   ├─ Check: !value → Error ✗
         │   └─ OK ✓
         │
         ├─ "phone":
         │   ├─ Check: /^\d+$/ → Pass ✓
         │   └─ Error ✗
         │
         ├─ "start_date":
         │   ├─ Check: required, isDate → Pass ✓
         │   └─ Error ✗
         │
         ├─ "end_date":
         │   ├─ Check: required, isDate → Pass ✓
         │   ├─ Check: end >= start → Pass ✓
         │   └─ Error ✗
         │
         ├─ "remarks":
         │   ├─ Check: length <= 500 → Pass ✓
         │   └─ Error ✗
         │
         ▼
    RETURN value OR null
```

---

## Animation Timeline

```
USER CLICKS CELL
│
├─ 0ms    Cell highlight pulse begins
│         opacity: 0 → 1 → 0.5
│         box-shadow: grows then shrinks
│
├─ 300ms  Modal enters screen
│         scale: 0.9 → 1
│         translateY: 20px → 0
│         opacity: 0 → 1
│
├─ 500ms  Modal fully visible
│         Input auto-focused
│
├─ ~2000ms User clicks Confirm
│          Saving to database...
│
└─ 600ms  Success pulse animation
          background: green → transparent
          Fade out smoothly
```

---

## Mobile Responsive Flow

```
VIEWPORT SIZE

┌─────────────────────────────┐
│ DESKTOP (> 1024px)          │
├─────────────────────────────┤
│ Full Table Layout           │
│ ┌──┬──┬──┬──┬──┬──┬──┐     │
│ │R │N │C │S │E │St│Rm│     │
│ ├──┼──┼──┼──┼──┼──┼──┤     │
│ │  │  │  │  │  │  │  │     │
│ │  │  │  │  │  │  │  │     │
│ └──┴──┴──┴──┴──┴──┴──┘     │
│ (All columns visible)       │
└─────────────────────────────┘
             ▼
┌─────────────────────────────┐
│ TABLET (768px - 1024px)     │
├─────────────────────────────┤
│ Optimized Table             │
│ ┌──┬──┬──┬──┬──┬──┐         │
│ │R │N │C │S │E │Rm│        │
│ ├──┼──┼──┼──┼──┼──┤        │
│ │  │  │  │  │  │  │        │
│ │        (scrollable)       │
│ └──┴──┴──┴──┴──┴──┘        │
└─────────────────────────────┘
             ▼
┌─────────────────────────────┐
│ MOBILE (< 768px)            │
├─────────────────────────────┤
│ Card Layout                 │
│ ┌────────────────────────┐  │
│ │ Room: 101              │  │
│ │ Name: John             │  │
│ │ Contact: 9876543210    │  │
│ │ Start: 01 May 2026     │  │
│ │ End: 01 Aug 2026       │  │
│ │ Status: PAID           │  │
│ │ Remark: Good resident  │  │
│ └────────────────────────┘  │
│                              │
│ ┌────────────────────────┐  │
│ │ Room: 102              │  │
│ │ (next card)            │  │
│ └────────────────────────┘  │
└─────────────────────────────┘
```

---

## Database Schema

```
Firestore Structure:

properties/
├─ {propertyId}
│  ├─ name: string
│  ├─ description: string
│  ├─ image_url: string
│  ├─ owner_id: string
│  ├─ total_rooms: number
│  │
│  └─ rooms/ (subcollection)
│     ├─ {roomId}
│     │  ├─ room_no: string ◄─── EDITABLE
│     │  ├─ capacity: number
│     │  ├─ monthly_rent: number
│     │  │
│     │  └─ residents/ (subcollection)
│     │     ├─ {residentId}
│     │     │  ├─ name: string ◄─── EDITABLE
│     │     │  ├─ email: string
│     │     │  ├─ phone: string ◄─── EDITABLE
│     │     │  ├─ gender: string
│     │     │  ├─ start_date: Date ◄─── EDITABLE
│     │     │  ├─ end_date: Date ◄─── EDITABLE
│     │     │  └─ remarks: string ◄─── EDITABLE
```

---

**Architecture Version:** 1.0
**Last Updated:** 2024

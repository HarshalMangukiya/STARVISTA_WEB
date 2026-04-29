# WhatsApp Reminder Feature - Test Scenarios & Verification

## ✅ Pre-Launch Verification Checklist

### Environment Setup
- [ ] Browser JavaScript enabled
- [ ] LocalStorage enabled in browser
- [ ] Pop-up blocker disabled (or allowed for this domain)
- [ ] WhatsApp account active on device or WhatsApp Web authenticated
- [ ] Firebase connection working (for reading resident data)
- [ ] Valid test residents created in database

---

## 🧪 Test Scenarios

### SCENARIO 1: Basic WhatsApp Icon Display

**Objective**: Verify icon displays only for UPCOMING status

**Prerequisites**:
- At least 3 residents with different payment statuses
- Resident A: PAID (>7 days)
- Resident B: UPCOMING (0-7 days)
- Resident C: PENDING (<0 days)

**Steps**:
```
1. Navigate to Property Detail page
2. Observe residents table

Expected Results:
┌───────────────────────────────────────────────────┐
│ RESIDENT | PHONE        | STATUS   | ICON        │
├───────────────────────────────────────────────────┤
│ Resident A │ 8160868146  | PAID     | ❌ Hidden   │
│ Resident B │ 8123456789  | UPCOMING | ✅ VISIBLE  │
│ Resident C │ 9876543210  | PENDING  | ❌ Hidden   │
└───────────────────────────────────────────────────┘

✅ PASS: Icon visible only for UPCOMING
```

**Failure Cases**:
- ❌ Icon shows for PAID → Check status calculation logic
- ❌ Icon hidden for UPCOMING → Check rendering condition

---

### SCENARIO 2: Icon Click Handler

**Objective**: Verify click opens confirmation popup

**Prerequisites**:
- Have Resident with UPCOMING status and valid phone

**Steps**:
```
1. Locate UPCOMING resident in table
2. Verify phone number visible (e.g., 📞 8160868146)
3. Click green WhatsApp icon

Expected Result:
- Confirmation popup appears immediately
- Modal shows: "Send Payment Reminder"
- Details show resident name, room, due date
- Buttons: Cancel, Send Reminder
```

**Verification**:
- [ ] Popup background is dark (overlay)
- [ ] Popup centered on screen
- [ ] All text readable
- [ ] Buttons clickable
- [ ] No console errors

---

### SCENARIO 3: Phone Validation - Valid Formats

**Objective**: Verify all valid phone formats work

**Test Cases**:

#### Case 3a: 10-digit Indian number
```
Phone: 8160868146
Expected: ✅ PASS - Opens confirmation
Reason: Valid 10-digit Indian format
```

#### Case 3b: With spaces
```
Phone: 8160 868 146
Expected: ✅ PASS - Opens confirmation
Reason: Spaces auto-removed
```

#### Case 3c: With country code
```
Phone: 91-8160868146
Expected: ✅ PASS - Opens confirmation
Reason: Country code handled
```

#### Case 3d: Full international
```
Phone: +91 8160868146
Expected: ✅ PASS - Opens confirmation
Reason: International format supported
```

---

### SCENARIO 4: Phone Validation - Invalid Formats

**Objective**: Verify invalid formats show error

**Test Cases**:

#### Case 4a: Too few digits
```
Phone: 816086814 (9 digits)
Click: WhatsApp icon
Expected: ❌ Error toast "Invalid phone number format"
```

#### Case 4b: Too many digits
```
Phone: 81608681461234 (14 digits)
Click: WhatsApp icon
Expected: ❌ Error toast "Invalid phone number format"
```

#### Case 4c: Alphabetic characters
```
Phone: 81608abc14
Click: WhatsApp icon
Expected: ❌ Error toast "Invalid phone number format"
```

#### Case 4d: Empty phone
```
Phone: (empty)
Click: WhatsApp icon
Expected: ❌ Error toast "Phone number not available"
```

---

### SCENARIO 5: Confirmation Dialog Details

**Objective**: Verify all details displayed correctly

**Setup**:
```
Resident: John Doe
Room: 105
Due Date: 20 Jan 2024
Phone: 8160868146
```

**Steps**:
1. Click WhatsApp icon
2. Examine popup content

**Verification**:
- [ ] Icon displayed: 💬
- [ ] Title: "Send Payment Reminder"
- [ ] Message: "Send payment reminder to John Doe?"
- [ ] Room detail shows: "Room: 105"
- [ ] Due Date shows: "Due Date: 20 Jan 2024"
- [ ] Format is DD MMM YYYY

**Details Box Expected**:
```
┌────────────────────┐
│ Room: 105          │
│ Due Date: 20 Jan 2024 │
└────────────────────┘
```

---

### SCENARIO 6: Confirmation - Cancel Action

**Objective**: Verify Cancel button works

**Steps**:
1. Click WhatsApp icon
2. See confirmation popup
3. Click "Cancel" button

**Expected Results**:
- [ ] Popup closes immediately
- [ ] No toast message shown
- [ ] No reminder saved to history
- [ ] Can immediately send to another resident (no cooldown applied)

**Verification**:
```javascript
// In browser console, check localStorage
localStorage.getItem('whatsapp_reminders')
// Should NOT have entry for this phone (if cancelled)
```

---

### SCENARIO 7: WhatsApp Opens (Desktop)

**Objective**: Verify WhatsApp Web opens with correct message

**Prerequisites**: Desktop browser, WhatsApp Web authenticated

**Steps**:
1. Click WhatsApp icon
2. Click "Send Reminder" in confirmation
3. Observe WhatsApp Web opens in new tab

**Expected Behavior**:
```
1. New tab opens to https://wa.me/918160868146?text=...
2. Conversation list loads
3. Chat window shows with pre-filled message:
   
   Hello John Doe,
   
   Your room payment is due soon.
   
   Room No: 105
   Due Date: 20 Jan 2024
   
   Please complete your payment on time.
   
   Thank you.

4. Message ready to send (cursor in text box)
5. Admin clicks Send to actually send
```

**Verification Checklist**:
- [ ] Correct phone number in URL
- [ ] Message is properly formatted
- [ ] Resident name included
- [ ] Room number correct
- [ ] Due date formatted correctly
- [ ] Professional tone
- [ ] No extra characters or encoding issues

---

### SCENARIO 8: WhatsApp Opens (Mobile)

**Objective**: Verify WhatsApp App opens on mobile

**Prerequisites**: Mobile device, WhatsApp App installed

**Steps**:
1. Open dashboard on mobile device
2. Find UPCOMING resident
3. Click WhatsApp icon
4. Click "Send Reminder"

**Expected Behavior**:
```
1. Browser redirects to WhatsApp App
2. Conversation screen opens
3. Message pre-filled in text box
4. Can edit if needed
5. Tap Send
```

**Verification**:
- [ ] App opens (not browser)
- [ ] Correct contact
- [ ] Message pre-filled
- [ ] Can edit message
- [ ] Can send

---

### SCENARIO 9: Cooldown - 30 Second Wait

**Objective**: Verify 30-second cooldown prevents spam

**Steps**:
```
Time: 10:00:00 - Click WhatsApp for Resident A
Time: 10:00:05 - Confirmation appears
Time: 10:00:10 - Click Send Reminder
           ↓ Toast: "Opening WhatsApp..."
           
Time: 10:00:15 - Click WhatsApp icon again for Resident A
Expected: ❌ Error Toast: "Please wait 15s before sending another reminder"
```

**Verification**:
- [ ] Second click rejected
- [ ] Toast shows countdown timer
- [ ] Timer counts down correctly
- [ ] After 30s, can send again

**Test Details**:
```javascript
// In console, can monitor:
console.log(isInCooldown('918160868146')); // true
console.log(getRemainingCooldown('918160868146')); // 25 (seconds)

// Wait 30 seconds...
console.log(isInCooldown('918160868146')); // false
```

---

### SCENARIO 10: Multiple Residents - No Cross-Cooldown

**Objective**: Verify cooldown applies per phone, not globally

**Setup**:
```
Resident A: Phone 8160868146
Resident B: Phone 9123456789
```

**Steps**:
```
Time: 10:00 - Send reminder to Resident A (phone: 8160868146)
Time: 10:05 - Try to send to Resident A again
Expected: ❌ "Please wait 25s..."

Time: 10:05 - Try to send to Resident B (phone: 9123456789)
Expected: ✅ Confirmation opens (different phone)
```

**Verification**:
- [ ] Can send to Resident B immediately (no wait)
- [ ] Only Resident A's phone is in cooldown
- [ ] Each phone has independent cooldown

---

### SCENARIO 11: Message Content Verification

**Objective**: Verify message content accuracy

**Setup Residents**:
```
Resident 1: Name="Raj Kumar", Room=201, Due=25 Jan 2024
Resident 2: Name="Sarah Mitchell", Room=305, Due=10 Feb 2024
```

**Messages Should Be**:
```
Resident 1:
Hello Raj Kumar,

Your room payment is due soon.

Room No: 201
Due Date: 25 Jan 2024

Please complete your payment on time.

Thank you.

---

Resident 2:
Hello Sarah Mitchell,

Your room payment is due soon.

Room No: 305
Due Date: 10 Feb 2024

Please complete your payment on time.

Thank you.
```

**Verification Checklist**:
- [ ] Resident name correct
- [ ] Room number correct
- [ ] Due date formatted as DD MMM YYYY
- [ ] Date is current, not hardcoded
- [ ] No personal info leaked
- [ ] Professional tone
- [ ] No typos

---

### SCENARIO 12: Error Handling - Missing Contact Info

**Objective**: Verify graceful handling of missing data

**Prerequisites**: Resident with empty/missing phone field

**Steps**:
1. Find resident with UPCOMING status but no phone
2. Observe table display

**Expected Results**:
- [ ] Phone cell shows: "📞 —" (dash)
- [ ] WhatsApp icon NOT visible (no button)
- [ ] No crash or console errors

**If icon somehow visible** (edge case):
1. Click it
2. Expected: Toast "Phone number not available"

---

### SCENARIO 13: Error Handling - Invalid Date Format

**Objective**: Verify date formatting handles edge cases

**Test Cases**:

#### Case: Null date
```
Resident: Name=John, EndDate=null
Click: WhatsApp
Confirmation should show: "Due Date: —"
```

#### Case: Invalid date string
```
Resident: Name=John, EndDate="invalid"
Click: WhatsApp
Should still open (with error handling)
```

#### Case: Very old date
```
Resident: Name=John, EndDate=01 Jan 2020
Click: WhatsApp
Message shows: "Due Date: 01 Jan 2020"
Note: Status should be PENDING (not UPCOMING)
```

---

### SCENARIO 14: Reminder History Tracking

**Objective**: Verify reminder history saves correctly

**Steps**:
```
1. Send reminder to resident with phone: 9876543210
2. Open browser console
3. Execute: localStorage.getItem('whatsapp_reminders')
```

**Expected Output**:
```json
{
  "919876543210": {
    "timestamp": 1704067200000,
    "name": "John Doe",
    "date": "2024-01-01T12:00:00.000Z"
  }
}
```

**Verification**:
- [ ] Phone number stored (with country code)
- [ ] Resident name stored
- [ ] Timestamp is numeric (milliseconds)
- [ ] Date is ISO format
- [ ] Entry created after clicking Send

---

### SCENARIO 15: Reminder History - Clear LocalStorage

**Objective**: Verify history can be cleared

**Steps**:
```javascript
// In console:
localStorage.removeItem('whatsapp_reminders')

// Try sending reminder again
// Should work (history cleared)
```

**Verification**:
- [ ] History cleared successfully
- [ ] Can send new reminders after clearing
- [ ] No errors

---

### SCENARIO 16: Browser Compatibility

**Test on Each Browser**:

#### Chrome (Desktop)
- [ ] Button renders correctly
- [ ] Popup appears
- [ ] WhatsApp Web opens
- [ ] Message pre-filled
- [ ] No console errors

#### Firefox (Desktop)
- [ ] Same as Chrome

#### Safari (Desktop)
- [ ] Same as Chrome

#### Chrome Mobile
- [ ] Button renders (mobile size)
- [ ] Popup responsive
- [ ] WhatsApp App opens
- [ ] Mobile-optimized

#### Safari iOS
- [ ] Button renders
- [ ] Popup responsive
- [ ] WhatsApp App opens

#### Firefox Android
- [ ] Same as Chrome Mobile

---

### SCENARIO 17: Responsive Design

**On Mobile (375px width)**:
```
Expected:
- Button still clickable (28x28px)
- Popup width: 95% of screen
- Popup content readable
- Buttons below each other
- Touch-friendly spacing
```

**On Tablet (600px width)**:
```
Expected:
- All elements visible
- Popup wider (60% of screen)
- Buttons side-by-side
- Comfortable touch targets
```

**On Desktop (1200px width)**:
```
Expected:
- Optimal layout
- Popup 400px max-width
- Buttons side-by-side
- Tooltips visible on hover
```

---

### SCENARIO 18: Accessibility

**Keyboard Navigation**:
```
1. Tab to WhatsApp button
2. Press Enter
3. Confirmation popup opens

4. Tab through buttons (Cancel, Send)
5. Press Enter to activate
```

**Screen Reader**:
```
- Button has aria-label: "Send WhatsApp reminder"
- Tooltip readable: "Send Reminder"
- Modal has proper role: "dialog"
- All text is properly labeled
```

---

### SCENARIO 19: Edge Cases - Multiple Status Changes

**Objective**: Verify icon toggles correctly when status changes

**Setup**: One resident, monitor icon visibility

**Steps**:
```
Initial: End Date 25 Jan 2024 (5 days away)
Status: UPCOMING → Icon visible ✅

Admin updates: End Date 20 Feb 2024 (15 days away)
Status: PAID → Icon hidden ✅

Admin updates: End Date 05 Jan 2024 (past date)
Status: PENDING → Icon hidden ✅

Admin updates: End Date 22 Jan 2024 (1 day away)
Status: UPCOMING → Icon visible ✅
```

---

### SCENARIO 20: Integration - Multiple Properties

**Objective**: Verify feature works across multiple properties

**Setup**:
```
Property A:
  - Room 101: John (UPCOMING, phone: 8160868146)
  - Room 102: Sarah (PAID)

Property B:
  - Room 201: Mike (UPCOMING, phone: 9123456789)
  - Room 202: Lisa (PENDING)
```

**Steps**:
1. Go to Property A
2. Send reminder to John ✅
3. Go to Property B
4. Send reminder to Mike ✅
5. Verify both in separate history entries

**Verification**:
```javascript
// Check localStorage for both
localStorage.getItem('whatsapp_reminders')
// Should have both phone numbers
```

---

## 🔍 Quick Verification Checklist

Print this and check off as you test:

### Pre-Deployment
- [ ] JavaScript enabled in browser
- [ ] LocalStorage available
- [ ] Firebase data loading correctly
- [ ] Test residents have proper status values
- [ ] WhatsApp Web authenticated (desktop) or app installed (mobile)

### Feature Display
- [ ] Icon visible for UPCOMING only
- [ ] Icon hidden for PAID
- [ ] Icon hidden for PENDING
- [ ] Icon positioned next to phone number
- [ ] Icon is green (#25D366)

### Functionality
- [ ] Click opens confirmation popup
- [ ] Confirmation shows resident name
- [ ] Confirmation shows room number
- [ ] Confirmation shows due date
- [ ] Cancel button closes popup
- [ ] Send button opens WhatsApp

### Validation
- [ ] Valid 10-digit phone: ✅ Works
- [ ] Invalid format: ❌ Shows error
- [ ] Empty phone: ❌ Shows error
- [ ] Different formats: ✅ All work

### Cooldown
- [ ] First send: ✅ Works
- [ ] Second send < 30s: ❌ Blocked
- [ ] Different phone < 30s: ✅ Works
- [ ] Different phone > 30s: ✅ Works

### Message Content
- [ ] Name in message: ✅
- [ ] Room number correct: ✅
- [ ] Date formatted: ✅
- [ ] No encoding issues: ✅

### Storage
- [ ] History saves to localStorage: ✅
- [ ] History can be cleared: ✅
- [ ] History format valid: ✅

### Browser Support
- [ ] Chrome: ✅
- [ ] Firefox: ✅
- [ ] Safari: ✅
- [ ] Mobile browsers: ✅

### Error Handling
- [ ] Invalid phone → Error message: ✅
- [ ] Missing phone → Error message: ✅
- [ ] Network issue → Error message: ✅
- [ ] WhatsApp blocked → Handles gracefully: ✅

---

## 📊 Test Results Template

```markdown
## WhatsApp Reminder Feature - Test Results

**Date**: _______________
**Tester**: _______________
**Browser**: _______________
**Device**: _______________

### Overall Status: [ ] PASS [ ] FAIL

### Test Scenarios
- [ ] Scenario 1: PASS / FAIL
- [ ] Scenario 2: PASS / FAIL
- [ ] Scenario 3: PASS / FAIL
[... continue for all scenarios]

### Issues Found
1. Issue: _______________
   Severity: [ ] Critical [ ] Major [ ] Minor
   Steps to Reproduce: _______________
   
2. Issue: _______________
   ...

### Comments
_______________

### Sign-off
Approved by: _______________
Date: _______________
```

---

## 🚀 Deployment Checklist

Before going live:

- [ ] All test scenarios passed
- [ ] No console errors
- [ ] No console warnings (except unrelated)
- [ ] localStorage working
- [ ] WhatsApp URLs working
- [ ] Responsive design verified
- [ ] Error messages user-friendly
- [ ] Documentation updated
- [ ] Team trained on feature
- [ ] Backup of current code taken
- [ ] Monitoring set up for WhatsApp failures

---

**Test Document Version**: 1.0  
**Last Updated**: January 2024  
**Status**: ✅ Ready for Testing

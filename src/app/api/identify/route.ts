import { type NextRequest, NextResponse } from "next/server"

interface Contact {
  id: number
  phoneNumber: string | null
  email: string | null
  linkedId: number | null
  linkPrecedence: "primary" | "secondary"
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

// In-memory database
const contacts: Contact[] = []
let nextId = 1

export async function POST(request: NextRequest) {
  try {
    const { email, phoneNumber } = await request.json()

    // Find existing contacts that match email or phoneNumber
    const matchingContacts = contacts.filter(
      (contact) => (email && contact.email === email) || (phoneNumber && contact.phoneNumber === phoneNumber),
    )

    if (matchingContacts.length === 0) {
      // No existing contacts - create new primary contact
      const newContact: Contact = {
        id: nextId++,
        phoneNumber: phoneNumber || null,
        email: email || null,
        linkedId: null,
        linkPrecedence: "primary",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      }

      contacts.push(newContact)

      return NextResponse.json({
        contact: {
          primaryContatctId: newContact.id,
          emails: email ? [email] : [],
          phoneNumbers: phoneNumber ? [phoneNumber] : [],
          secondaryContactIds: [],
        },
      })
    }

    // Find all linked contacts
    const allLinkedIds = new Set<number>()
    matchingContacts.forEach((contact) => {
      allLinkedIds.add(contact.id)
      if (contact.linkedId) allLinkedIds.add(contact.linkedId)
    })

    // Add contacts that link to any of these
    contacts.forEach((contact) => {
      if (contact.linkedId && allLinkedIds.has(contact.linkedId)) {
        allLinkedIds.add(contact.id)
      }
    })

    const allLinkedContacts = contacts
      .filter((contact) => allLinkedIds.has(contact.id))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

    // Find primary contact (oldest)
    let primaryContact = allLinkedContacts.find((c) => c.linkPrecedence === "primary")

    // If multiple primaries, convert newer ones to secondary
    const primaries = allLinkedContacts.filter((c) => c.linkPrecedence === "primary")
    if (primaries.length > 1) {
      primaryContact = primaries[0] // oldest
      for (let i = 1; i < primaries.length; i++) {
        primaries[i].linkPrecedence = "secondary"
        primaries[i].linkedId = primaryContact.id
        primaries[i].updatedAt = new Date().toISOString()
      }
    }

    if (!primaryContact) {
      return NextResponse.json({ error: "No primary contact found" }, { status: 500 })
    }

    // Check if we need to create a new secondary contact
    const exactMatch = allLinkedContacts.find(
      (contact) => contact.email === email && contact.phoneNumber === phoneNumber,
    )

    if (!exactMatch) {
      const hasNewInfo =
        (email && !allLinkedContacts.some((c) => c.email === email)) ||
        (phoneNumber && !allLinkedContacts.some((c) => c.phoneNumber === phoneNumber))

      if (hasNewInfo) {
        const newSecondary: Contact = {
          id: nextId++,
          phoneNumber: phoneNumber || null,
          email: email || null,
          linkedId: primaryContact.id,
          linkPrecedence: "secondary",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
        }

        contacts.push(newSecondary)
        allLinkedContacts.push(newSecondary)
      }
    }

    // Build response
    const secondaryContacts = allLinkedContacts.filter((c) => c.linkPrecedence === "secondary")
    const emails = [...new Set(allLinkedContacts.filter((c) => c.email).map((c) => c.email!))]
    const phoneNumbers = [...new Set(allLinkedContacts.filter((c) => c.phoneNumber).map((c) => c.phoneNumber!))]

    // Put primary contact's info first
    if (primaryContact.email && emails.includes(primaryContact.email)) {
      emails.splice(emails.indexOf(primaryContact.email), 1)
      emails.unshift(primaryContact.email)
    }
    if (primaryContact.phoneNumber && phoneNumbers.includes(primaryContact.phoneNumber)) {
      phoneNumbers.splice(phoneNumbers.indexOf(primaryContact.phoneNumber), 1)
      phoneNumbers.unshift(primaryContact.phoneNumber)
    }

    return NextResponse.json({
      contact: {
        primaryContatctId: primaryContact.id,
        emails,
        phoneNumbers,
        secondaryContactIds: secondaryContacts.map((c) => c.id),
      },
    })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

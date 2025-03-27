import { useState } from "react"
import OtpGate from "./OtpGate"
import MessagesPage from "./MessagesPage"

export default function MessagesPageWithOtp() {
  const [authorized, setAuthorized] = useState(false)

  if (!authorized) {
    return <OtpGate onSuccess={() => setAuthorized(true)} />
  }

  return <MessagesPage />
}

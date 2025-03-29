import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function OtpGate({ onSuccess }: { onSuccess: () => void }) {
  const [otp, setOtp] = useState("")
  const [error, setError] = useState("")
  const navigate = useNavigate()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
  
    const correctOtp = import.meta.env.VITE_ADMIN_OTP
    if (otp === correctOtp) {
      onSuccess()
    } else {
      setError("Incorrect code. Redirecting...")
      setTimeout(() => {
        navigate("/")
      }, 1000)
    }
  }
  

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <form onSubmit={handleSubmit} className="space-y-6 w-full max-w-sm bg-card p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-center">Enter Admin Code</h2>
        <Input
          type="number"
          maxLength={4}
          placeholder="Auth code"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          className="text-center text-lg tracking-widest"
          required
        />
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        <Button type="submit" className="w-full">Submit</Button>
      </form>
    </div>
  )
}

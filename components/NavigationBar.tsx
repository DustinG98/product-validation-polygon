import React from 'react'
import Link from 'next/link'

export const NavigationBar = () => {
    return (
        <div>
            <Link href="/brands">Brands</Link>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/login">Login</Link>
        </div>
    )
}
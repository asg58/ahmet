'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-12 bg-gradient-to-b from-blue-50 to-white">
      <header className="flex flex-col items-center mb-12">
        <h1 className="text-4xl font-bold text-center text-blue-600">
          CorelDRAW AI Agent
        </h1>
        <p className="mt-4 text-xl text-center text-gray-600 max-w-2xl">
          Een conversationele AI-agent die CorelDRAW en Blender kan aansturen via natuurlijke taal
        </p>
      </header>

      <div className="grid gap-6 mt-8 sm:grid-cols-2 md:grid-cols-3">
        <Link
          href="/chat"
          className="flex flex-col items-center p-6 transition-all rounded-lg shadow-lg hover:shadow-xl bg-white hover:scale-105"
        >
          <div className="p-3 mb-4 text-white bg-blue-500 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-semibold">Chat Interface</h2>
          <p className="text-center text-gray-600">
            Begin een gesprek met de AI om CorelDRAW en Blender aan te sturen
          </p>
        </Link>

        <Link
          href="/context-viewer"
          className="flex flex-col items-center p-6 transition-all rounded-lg shadow-lg hover:shadow-xl bg-white hover:scale-105"
        >
          <div className="p-3 mb-4 text-white bg-blue-500 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-semibold">Context Viewer</h2>
          <p className="text-center text-gray-600">
            Bekijk de huidige context van CorelDRAW en Blender in real-time
          </p>
        </Link>

        <Link
          href="/viewer"
          className="flex flex-col items-center p-6 transition-all rounded-lg shadow-lg hover:shadow-xl bg-white hover:scale-105"
        >
          <div className="p-3 mb-4 text-white bg-blue-500 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-semibold">3D Viewer</h2>
          <p className="text-center text-gray-600">
            Bekijk en interacteer met 3D modellen gemaakt in Blender
          </p>
        </Link>

        <Link
          href="/settings"
          className="flex flex-col items-center p-6 transition-all rounded-lg shadow-lg hover:shadow-xl bg-white hover:scale-105"
        >
          <div className="p-3 mb-4 text-white bg-blue-500 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-semibold">Instellingen</h2>
          <p className="text-center text-gray-600">
            Configureer de AI agent en software-integraties
          </p>
        </Link>
      </div>
      
      <div className="mt-16 text-center">
        <p className="text-gray-500">
          Drijft op lokale Ollama LLM-modellen voor privacy en offline gebruik
        </p>
        <div className="flex items-center justify-center mt-4 space-x-4">
          <Link href="/docs" className="text-blue-600 hover:underline">
            Documentatie
          </Link>
          <span className="text-gray-400">•</span>
          <Link href="/about" className="text-blue-600 hover:underline">
            Over
          </Link>
          <span className="text-gray-400">•</span>
          <Link href="https://github.com/" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
            GitHub
          </Link>
        </div>
      </div>
    </div>
  )
} 
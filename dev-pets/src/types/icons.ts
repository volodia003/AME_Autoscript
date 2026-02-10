import { JSX } from "react"

export interface NavRoute {
    id: string
    label: string
    href: string
    icon: JSX.Element
    section?: string
    isActive?: boolean
}

export enum Icons {
    github = 'github',
    gitlab = 'gitlab',
    google = 'google',
    ferris = 'ferris',
    discord = 'discord',
}
import React, { useEffect, useMemo } from 'react'
import { ResolvedRevisionSpec, RevisionSpec } from '../../../../shared/src/util/url'
import { BreadcrumbSetters } from '../../components/Breadcrumbs'
import { RepoHeaderContributionsLifecycleProps } from '../../repo/RepoHeader'
import { eventLogger } from '../../tracking/eventLogger'

interface Props
    extends RepoHeaderContributionsLifecycleProps,
        Partial<RevisionSpec>,
        ResolvedRevisionSpec,
        BreadcrumbSetters {}

export const RepositorySymbolsPage: React.FunctionComponent<Props> = ({ useBreadcrumb }) => {
    useEffect(() => {
        eventLogger.logViewEvent('RepositoryCommits')
    }, [])

    useBreadcrumb(useMemo(() => ({ key: 'commits', element: <>Symbols</> }), []))

    return (
        <div>
            <ul>
                <li>todo</li>
            </ul>
        </div>
    )
}

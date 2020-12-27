import React from 'react'
import { RepoContainerRoute } from '../../repo/RepoContainer'
import { RepoRevisionContainerRoute } from '../../repo/RepoRevisionContainer'
import { repoContainerRoutes, repoRevisionContainerRoutes } from '../../repo/routes'
import { lazyComponent } from '../../util/lazyComponent'

const RepositorySymbolsPage = lazyComponent(() => import('../symbols/RepositorySymbolsPage'), 'RepositorySymbolsPage')

export const enterpriseRepoContainerRoutes: readonly RepoContainerRoute[] = repoContainerRoutes

export const enterpriseRepoRevisionContainerRoutes: readonly RepoRevisionContainerRoute[] = [
    ...repoRevisionContainerRoutes,
    {
        path: '/-/symbols',
        render: ({ resolvedRev: { commitID }, repoHeaderContributionsLifecycleProps, ...context }) => (
            <RepositorySymbolsPage
                {...context}
                commitID={commitID}
                repoHeaderContributionsLifecycleProps={repoHeaderContributionsLifecycleProps}
            />
        ),
    },
]

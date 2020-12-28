import React from 'react'
import { RouteComponentProps } from 'react-router'
import { RepoContainerRoute } from '../../repo/RepoContainer'
import { RepoRevisionContainerContext, RepoRevisionContainerRoute } from '../../repo/RepoRevisionContainer'
import { repoContainerRoutes, repoRevisionContainerRoutes } from '../../repo/routes'
import { lazyComponent } from '../../util/lazyComponent'

const RepositorySymbolsPage = lazyComponent(() => import('../symbols/RepositorySymbolsPage'), 'RepositorySymbolsPage')
const RepositorySymbolPage = lazyComponent(() => import('../symbols/RepositorySymbolPage'), 'RepositorySymbolPage')
const RepositoryDependenciesPage = lazyComponent(
    () => import('./network/RepositoryDependenciesPage'),
    'RepositoryDependenciesPage'
)

export const enterpriseRepoContainerRoutes: readonly RepoContainerRoute[] = repoContainerRoutes

export const enterpriseRepoRevisionContainerRoutes: readonly RepoRevisionContainerRoute[] = [
    ...repoRevisionContainerRoutes,
    {
        path: '/-/symbols',
        exact: true,
        render: context => <RepositorySymbolsPage {...context} />,
    },
    {
        path: '/-/symbols/:scheme/:identifier+',
        render: (
            context: RepoRevisionContainerContext & RouteComponentProps<{ scheme: string; identifier: string }>
        ) => <RepositorySymbolPage {...context} />,
    },
    {
        path: '/-/dependencies',
        render: context => <RepositoryDependenciesPage {...context} />,
    },
]

import React, { useEffect, useMemo } from 'react'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { dataOrThrowErrors, gql } from '../../../../shared/src/graphql/graphql'
import { useObservable } from '../../../../shared/src/util/useObservable'
import { requestGraphQL } from '../../backend/graphql'
import { BreadcrumbSetters } from '../../components/Breadcrumbs'
import { RepoHeaderContributionsLifecycleProps } from '../../repo/RepoHeader'
import { eventLogger } from '../../tracking/eventLogger'
import {
    ExpSymbolDetailFields,
    RepositoryExpSymbolResult,
    RepositoryExpSymbolVariables,
} from '../../graphql-operations'
import { RepoRevisionContainerContext } from '../../repo/RepoRevisionContainer'
import { RouteComponentProps } from 'react-router'
import { SettingsCascadeProps } from '../../../../shared/src/settings/settings'
import { ExpSymbolDetailGQLFragment, SymbolDetail } from './SymbolDetail'

const queryRepositorySymbol = (
    vars: RepositoryExpSymbolVariables & { scheme: string; identifier: string }
): Observable<ExpSymbolDetailFields | null> =>
    requestGraphQL<RepositoryExpSymbolResult, RepositoryExpSymbolVariables>(
        gql`
            query RepositoryExpSymbol($repo: ID!, $revision: String!) {
                node(id: $repo) {
                    ... on Repository {
                        commit(rev: $revision) {
                            tree(path: "") {
                                expSymbols {
                                    nodes {
                                        ...ExpSymbolDetailFields
                                        children {
                                            ...ExpSymbolDetailFields
                                            children {
                                                ...ExpSymbolDetailFields
                                            }
                                        }
                                        ...ExpSymbolDetailFields
                                    }
                                }
                            }
                        }
                    }
                }
            }
            ${ExpSymbolDetailGQLFragment}
        `,
        vars
    ).pipe(
        map(dataOrThrowErrors),
        map(data => {
            // eslint-disable-next-line unicorn/consistent-function-scoping
            const match = (sym: ExpSymbolDetailFields): boolean =>
                sym.moniker.scheme === vars.scheme && sym.moniker.identifier === vars.identifier
            for (const node of data.node?.commit?.tree?.expSymbols?.nodes || []) {
                if (match(node)) {
                    return node
                }
                for (const child of node.children) {
                    if (match(child)) {
                        return child
                    }
                    for (const childChild of child.children) {
                        if (match(childChild)) {
                            return childChild
                        }
                    }
                }
            }
            return null
        })
    )

interface Props
    extends Pick<RepoRevisionContainerContext, 'repo' | 'resolvedRev' | 'revision'>,
        RouteComponentProps<{ scheme: string; identifier: string }>,
        RepoHeaderContributionsLifecycleProps,
        BreadcrumbSetters,
        SettingsCascadeProps {}

export const RepositorySymbolPage: React.FunctionComponent<Props> = ({
    repo,
    revision,
    resolvedRev,
    match: {
        params: { scheme, identifier },
    },
    useBreadcrumb,
    ...props
}) => {
    useEffect(() => {
        eventLogger.logViewEvent('RepositorySymbol')
    }, [])

    useBreadcrumb(useMemo(() => ({ key: 'symbol', element: <>Symbol</> }), []))

    const data = useObservable(
        useMemo(() => queryRepositorySymbol({ repo: repo.id, revision, scheme, identifier }), [
            identifier,
            repo.id,
            revision,
            scheme,
        ])
    )

    return (
        <div className="container" style={{ overflow: 'auto' }}>
            {data === null ? (
                <p>Not found</p>
            ) : data === undefined ? (
                <p>Loading...</p>
            ) : (
                <SymbolDetail {...props} symbol={data} />
            )}
        </div>
    )
}

import React, { useEffect, useMemo } from 'react'
import H from 'history'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { dataOrThrowErrors, gql } from '../../../../shared/src/graphql/graphql'
import { useObservable } from '../../../../shared/src/util/useObservable'
import { requestGraphQL } from '../../backend/graphql'
import { BreadcrumbSetters } from '../../components/Breadcrumbs'
import { RepoHeaderContributionsLifecycleProps } from '../../repo/RepoHeader'
import { eventLogger } from '../../tracking/eventLogger'
import {
    RepositoryExpSymbolsFields,
    RepositoryExpSymbolsVariables,
    RepositoryExpSymbolsResult,
} from '../../graphql-operations'
import { RepoRevisionContainerContext } from '../../repo/RepoRevisionContainer'
import { Link } from 'react-router-dom'
import { ExpSymbolDetailGQLFragment, SymbolDetail } from './SymbolDetail'
import { SettingsCascadeProps } from '../../../../shared/src/settings/settings'

const RepositoryExpSymbolsGQLFragment = gql`
    fragment RepositoryExpSymbolsFields on ExpSymbol {
        text
        moniker {
            identifier
        }
        url
        children {
            text
            url
        }
        ...ExpSymbolDetailFields
    }
    ${ExpSymbolDetailGQLFragment}
`

const queryRepositorySymbols = (vars: RepositoryExpSymbolsVariables): Observable<RepositoryExpSymbolsFields[] | null> =>
    requestGraphQL<RepositoryExpSymbolsResult, RepositoryExpSymbolsVariables>(
        gql`
            query RepositoryExpSymbols($repo: ID!, $commitID: String!, $path: String!) {
                node(id: $repo) {
                    ... on Repository {
                        commit(rev: $commitID) {
                            tree(path: $path) {
                                expSymbols {
                                    nodes {
                                        ...RepositoryExpSymbolsFields
                                    }
                                }
                            }
                        }
                    }
                }
            }
            ${RepositoryExpSymbolsGQLFragment}
        `,
        vars
    ).pipe(
        map(dataOrThrowErrors),
        map(data => data.node?.commit?.tree?.expSymbols?.nodes || null)
    )

interface Props
    extends Pick<RepoRevisionContainerContext, 'repo' | 'resolvedRev'>,
        RepoHeaderContributionsLifecycleProps,
        BreadcrumbSetters,
        SettingsCascadeProps {
    history: H.History
    location: H.Location
}

export const RepositorySymbolsPage: React.FunctionComponent<Props> = ({
    repo,
    resolvedRev,
    useBreadcrumb,
    ...props
}) => {
    useEffect(() => {
        eventLogger.logViewEvent('RepositorySymbols')
    }, [])

    useBreadcrumb(useMemo(() => ({ key: 'symbols', element: <>Symbols</> }), []))

    const data = useObservable(
        useMemo(() => queryRepositorySymbols({ repo: repo.id, commitID: resolvedRev.commitID, path: '.' }), [
            repo.id,
            resolvedRev.commitID,
        ])
    )

    return data ? (
        <>
            <ul className="sticky-top flex-column list-unstyled p-3" style={{ flex: '0 0 auto', overflow: 'auto' }}>
                {data.map(symbol => (
                    <li key={symbol.url} className="pb-1">
                        <Link to={symbol.url}>{symbol.text}</Link>
                        {symbol.children.length > 0 && (
                            <ul className="list-unstyled pl-3">
                                {symbol.children.map(childSymbol => (
                                    <li key={childSymbol.url}>
                                        <Link to={childSymbol.url}>{childSymbol.text}</Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </li>
                ))}
            </ul>
            <div style={{ overflow: 'auto' }}>
                {data.map(symbol => (
                    <section key={symbol.url} className="my-5">
                        <SymbolDetail {...props} symbol={symbol} />
                        <div className="pb-4" />
                    </section>
                ))}
            </div>
        </>
    ) : (
        <p>Loading...</p>
    )
}

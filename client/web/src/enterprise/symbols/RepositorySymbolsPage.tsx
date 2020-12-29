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
    RepositoryExpSymbolsFields,
    RepositoryExpSymbolsVariables,
    RepositoryExpSymbolsResult,
} from '../../graphql-operations'
import { RepoRevisionContainerContext } from '../../repo/RepoRevisionContainer'
import { Link } from 'react-router-dom'

const RepositoryExpSymbolsGQLFragment = gql`
    fragment RepositoryExpSymbolsFields on ExpSymbol {
        text
        moniker {
            identifier
        }
        url
    }
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
        BreadcrumbSetters {}

export const RepositorySymbolsPage: React.FunctionComponent<Props> = ({ repo, resolvedRev, useBreadcrumb }) => {
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

    return (
        <div className="container mt-3">
            {data ? (
                <ul>
                    {data.map(symbol => (
                        <li key={symbol.url}>
                            <Link to={symbol.url}>{symbol.text}</Link>
                        </li>
                    ))}
                </ul>
            ) : (
                'Loading...'
            )}
        </div>
    )
}

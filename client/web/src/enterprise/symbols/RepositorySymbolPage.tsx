import React, { useEffect, useMemo } from 'react'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { dataOrThrowErrors, gql } from '../../../../shared/src/graphql/graphql'
import { useObservable } from '../../../../shared/src/util/useObservable'
import { requestGraphQL } from '../../backend/graphql'
import { BreadcrumbSetters } from '../../components/Breadcrumbs'
import { RepoHeaderContributionsLifecycleProps } from '../../repo/RepoHeader'
import { eventLogger } from '../../tracking/eventLogger'
import { DepsFields, RepositorySymbolResult, RepositorySymbolVariables } from '../../graphql-operations'
import { RepoRevisionContainerContext } from '../../repo/RepoRevisionContainer'
import { RouteComponentProps } from 'react-router'

const ExpSymbolGQLFragment = gql`
    fragment ExpSymbolFields on ExpSymbol {
        moniker {
            kind
            scheme
            identifier
        }
        hover {
            markdown {
                html
            }
        }
    }
`

const queryRepositorySymbol = (
    vars: RepositorySymbolVariables & { scheme: string; identifier: string }
): Observable<DepsFields | null> =>
    requestGraphQL<RepositorySymbolResult, RepositorySymbolVariables>(
        gql`
            query RepositorySymbol($repo: ID!, $commitID: String!) {
                node(id: $repo) {
                    ... on Repository {
                        commit(rev: $commitID) {
                            tree(path: "") {
                                expSymbols {
                                    nodes {
                                        ...ExpSymbolFields
                                    }
                                }
                            }
                        }
                    }
                }
            }
            ${ExpSymbolGQLFragment}
        `,
        vars
    ).pipe(
        map(dataOrThrowErrors),
        map(data => data.node?.commit?.tree || null)
    )

interface Props
    extends Pick<RepoRevisionContainerContext, 'repo' | 'resolvedRev'>,
        RouteComponentProps<{ scheme: string; identifier: string }>,
        RepoHeaderContributionsLifecycleProps,
        BreadcrumbSetters {}

export const RepositorySymbolPage: React.FunctionComponent<Props> = ({
    repo,
    resolvedRev,
    match: {
        params: { scheme, identifier },
    },
    useBreadcrumb,
}) => {
    useEffect(() => {
        eventLogger.logViewEvent('RepositorySymbol')
    }, [])

    useBreadcrumb(useMemo(() => ({ key: 'symbol', element: <>Symbol</> }), []))

    const data = useObservable(
        useMemo(() => queryRepositorySymbol({ repo: repo.id, commitID: resolvedRev.commitID, scheme, identifier }), [
            repo.id,
            resolvedRev.commitID,
        ])
    )

    return (
        <div>
            {data ? (
                <ul>
                    {data.lsif?.packages.nodes.map((package_, index) => (
                        <li key={index}>{JSON.stringify(package_)}</li>
                    ))}
                </ul>
            ) : (
                'Loading...'
            )}
        </div>
    )
}

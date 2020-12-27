import React, { useEffect, useMemo } from 'react'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { dataOrThrowErrors, gql } from '../../../../shared/src/graphql/graphql'
import { useObservable } from '../../../../shared/src/util/useObservable'
import { requestGraphQL } from '../../backend/graphql'
import { BreadcrumbSetters } from '../../components/Breadcrumbs'
import { RepoHeaderContributionsLifecycleProps } from '../../repo/RepoHeader'
import { eventLogger } from '../../tracking/eventLogger'
import { DepsFields, DepsResult, DepsVariables } from '../../graphql-operations'
import { RepoRevisionContainerContext } from '../../repo/RepoRevisionContainer'

const DepsGQLFragment = gql`
    fragment DepsFields on GitTree {
        lsif {
            packages {
                nodes {
                    name
                    version
                    manager
                }
            }
        }
    }
`

const queryRepositorySymbols = (vars: DepsVariables): Observable<DepsFields | null> =>
    requestGraphQL<DepsResult, DepsVariables>(
        gql`
            query Deps($repo: ID!, $commitID: String!, $path: String!) {
                node(id: $repo) {
                    ... on Repository {
                        commit(rev: $commitID) {
                            tree(path: $path) {
                                ...DepsFields
                            }
                        }
                    }
                }
            }
            ${DepsGQLFragment}
        `,
        vars
    ).pipe(
        map(dataOrThrowErrors),
        map(data => data.node?.commit?.tree || null)
    )

interface Props
    extends Pick<RepoRevisionContainerContext, 'repo' | 'resolvedRev'>,
        RepoHeaderContributionsLifecycleProps,
        BreadcrumbSetters {}

export const RepositorySymbolsPage: React.FunctionComponent<Props> = ({ repo, resolvedRev, useBreadcrumb }) => {
    useEffect(() => {
        eventLogger.logViewEvent('RepositoryCommits')
    }, [])

    useBreadcrumb(useMemo(() => ({ key: 'commits', element: <>Symbols</> }), []))

    const data = useObservable(
        useMemo(() => queryRepositorySymbols({ repo: repo.id, commitID: resolvedRev.commitID, path: '.' }), [
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

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Observable, of } from 'rxjs'
import { map } from 'rxjs/operators'
import { dataOrThrowErrors, gql } from '../../../../shared/src/graphql/graphql'
import { useObservable } from '../../../../shared/src/util/useObservable'
import { requestGraphQL } from '../../backend/graphql'
import { BreadcrumbSetters } from '../../components/Breadcrumbs'
import { RepoHeaderContributionsLifecycleProps } from '../../repo/RepoHeader'
import { eventLogger } from '../../tracking/eventLogger'
import { ExpSymbolFields, RepositoryExpSymbolResult, RepositoryExpSymbolVariables } from '../../graphql-operations'
import { RepoRevisionContainerContext } from '../../repo/RepoRevisionContainer'
import { RouteComponentProps } from 'react-router'
import { Markdown } from '../../../../shared/src/components/Markdown'
import SourceRepositoryIcon from 'mdi-react/SourceRepositoryIcon'
import { fetchHighlightedFileLineRanges } from '../../repo/backend'
import { SettingsCascadeProps } from '../../../../shared/src/settings/settings'
import { FileLocations } from '../../../../branded/src/components/panel/views/FileLocations'
import { Location } from '@sourcegraph/extension-api-types'
import { makeRepoURI } from '../../../../shared/src/util/url'
import { renderMarkdown } from '../../../../shared/src/util/markdown'
import Scrollspy from 'react-scrollspy'
import { Link, NavLink } from 'react-router-dom'

const ExpSymbolGQLFragment = gql`
    fragment ExpSymbolFields on ExpSymbol {
        moniker {
            kind
            scheme
            identifier
        }
        hover {
            markdown {
                text
            }
        }
        references {
            nodes {
                range {
                    start {
                        line
                        character
                    }
                    end {
                        line
                        character
                    }
                }
                resource {
                    path
                    commit {
                        oid
                    }
                    repository {
                        name
                    }
                }
            }
        }
    }
`

const queryRepositorySymbol = (
    vars: RepositoryExpSymbolVariables & { scheme: string; identifier: string }
): Observable<ExpSymbolFields | null> =>
    requestGraphQL<RepositoryExpSymbolResult, RepositoryExpSymbolVariables>(
        gql`
            query RepositoryExpSymbol($repo: ID!, $commitID: String!) {
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
        map(
            data =>
                data.node?.commit?.tree?.expSymbols?.nodes.find(
                    node => node.moniker.scheme === vars.scheme && node.moniker.identifier === vars.identifier
                ) || null
        )
    )

interface Props
    extends Pick<RepoRevisionContainerContext, 'repo' | 'resolvedRev'>,
        RouteComponentProps<{ scheme: string; identifier: string }>,
        RepoHeaderContributionsLifecycleProps,
        BreadcrumbSetters,
        SettingsCascadeProps {}

export const RepositorySymbolPage: React.FunctionComponent<Props> = ({
    repo,
    resolvedRev,
    match: {
        params: { scheme, identifier },
    },
    useBreadcrumb,
    history,
    location,
    settingsCascade,
}) => {
    useEffect(() => {
        eventLogger.logViewEvent('RepositorySymbol')
    }, [])

    useBreadcrumb(useMemo(() => ({ key: 'symbol', element: <>Symbol</> }), []))

    const data = useObservable(
        useMemo(() => queryRepositorySymbol({ repo: repo.id, commitID: resolvedRev.commitID, scheme, identifier }), [
            identifier,
            repo.id,
            resolvedRev.commitID,
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
                <div>
                    <style>{'.markdown pre code { font-size: 18px; } .markdown pre { margin-bottom: 0; }'}</style>
                    <section id="doc">
                        {data.hover?.markdown.text && (
                            <Markdown
                                dangerousInnerHTML={renderMarkdown(
                                    data.hover?.markdown.text.split('---', 2)[0]
                                ).replace(/<hr\s?\/?>/g, '')}
                                history={history}
                                className="mt-3 mx-3"
                            />
                        )}

                        <ul
                            className="list-unstyled nav nav-pills d-flex flex-wrap justify-content-end"
                            style={{ position: 'relative', marginTop: '-2.31rem', marginRight: '1.09rem' }}
                        >
                            <li className="nav-item">
                                <Link to="TODO" className="nav-link btn btn-secondary">
                                    Go to definition
                                </Link>
                            </li>
                        </ul>

                        {data.hover?.markdown.text && (
                            <Markdown
                                dangerousInnerHTML={renderMarkdown(
                                    data.hover?.markdown.text.split('---', 2)[1]
                                ).replace(/<hr\s?\/?>/g, '')}
                                history={history}
                                className="m-3 pt-3"
                            />
                        )}
                    </section>
                    <section id="refs" className="mt-5">
                        <h2 className="mt-3 mx-3 mb-0 h4">Examples</h2>
                        <style>
                            {
                                'td.line { display: none; } .code-excerpt .code { padding-left: 0.25rem !important; } .result-container__header { display: none; } .result-container { border: solid 1px var(--border-color) !important; border-width: 1px !important; margin: 1rem; }'
                            }
                        </style>
                        <FileLocations
                            location={location}
                            locations={of(
                                data.references.nodes.slice(1, 4).map<Location>(reference => ({
                                    uri: makeRepoURI({
                                        repoName: reference.resource.repository.name,
                                        commitID: reference.resource.commit.oid,
                                        filePath: reference.resource.path,
                                    }),
                                    range: reference.range!,
                                }))
                            )}
                            icon={SourceRepositoryIcon}
                            isLightTheme={false /* TODO(sqs) */}
                            fetchHighlightedFileLineRanges={fetchHighlightedFileLineRanges}
                            settingsCascade={settingsCascade}
                            versionContext={undefined /* TODO(sqs) */}
                        />
                    </section>
                </div>
            )}
        </div>
    )
}

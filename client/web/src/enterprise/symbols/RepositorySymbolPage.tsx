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

    const sections = useMemo<{ id: string; label: string }[]>(
        () => [
            { id: 'def', label: 'Definition' },
            { id: 'doc', label: 'Documentation' },
            { id: 'examples', label: 'Examples' },
            { id: 'refs', label: 'References' },
        ],
        []
    )

    const [activeSection, setActiveSection] = useState<string>(sections[0].id)
    const onActiveSectionUpdate = useCallback((element: HTMLElement) => setActiveSection(element.id), [])

    return (
        <div className="w-100" style={{ overflow: 'auto' }} id="RepositorySymbolPage">
            {data === null ? (
                <p>Not found</p>
            ) : data === undefined ? (
                <p>Loading...</p>
            ) : (
                <div className="row no-gutters flex-row-reverse">
                    <div className="col-md-2">
                        <Scrollspy
                            items={sections.map(({ id }) => id)}
                            componentTag="ul"
                            className="nav nav-pills flex-column mx-3 pt-3 sticky-top"
                            currentClassName="active"
                            rootEl="#RepositorySymbolPage"
                            onUpdate={onActiveSectionUpdate}
                        >
                            {sections.map(({ id, label }) => (
                                <li key={id} className="nav-item">
                                    <Link className={`nav-link ${activeSection === id ? 'active' : ''}`} to={`#${id}`}>
                                        {label}
                                    </Link>
                                </li>
                            ))}
                        </Scrollspy>
                    </div>
                    <div className="col-md-10">
                        <style>{'.markdown pre code { font-size: 18px; }'}</style>
                        <section id="doc">
                            {data.hover?.markdown.text && (
                                <Markdown
                                    dangerousInnerHTML={renderMarkdown(
                                        data.hover?.markdown.text.split('---', 2)[0]
                                    ).replace(/<hr\s?\/?>/g, '')}
                                    history={history}
                                    className="m-3"
                                />
                            )}

                            <ul className="list-unstyled nav nav-pills m-3 d-flex flex-wrap">
                                <li className="nav-item ">
                                    <Link to="TODO" className="nav-link">
                                        Defined in <code>token.go</code>
                                    </Link>
                                </li>
                                <li className="nav-item ">
                                    <Link to="TODO" className="nav-link">
                                        References
                                    </Link>
                                </li>
                            </ul>

                            {data.hover?.markdown.text && (
                                <Markdown
                                    dangerousInnerHTML={renderMarkdown(
                                        data.hover?.markdown.text.split('---', 2)[1]
                                    ).replace(/<hr\s?\/?>/g, '')}
                                    history={history}
                                    className="m-3"
                                />
                            )}
                        </section>
                        <section id="refs" className="mt-5">
                            <h2 className="m-3 h4">Usage examples ({data.references.nodes.length})</h2>
                            <style>
                                {
                                    'td.line { display: none; } .code-excerpt .code { padding-left: 0.25rem !important; } .result-container__header { display: none; } .result-container { border-bottom: solid 1px var(--border-color); }'
                                }
                            </style>
                            <FileLocations
                                location={location}
                                locations={of(
                                    data.references.nodes.map<Location>(reference => ({
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
                </div>
            )}
        </div>
    )
}

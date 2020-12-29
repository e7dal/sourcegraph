import React from 'react'
import H from 'history'
import { of } from 'rxjs'
import { gql } from '../../../../shared/src/graphql/graphql'
import { ExpSymbolDetailFields } from '../../graphql-operations'
import { Markdown } from '../../../../shared/src/components/Markdown'
import SourceRepositoryIcon from 'mdi-react/SourceRepositoryIcon'
import { fetchHighlightedFileLineRanges } from '../../repo/backend'
import { SettingsCascadeProps } from '../../../../shared/src/settings/settings'
import { FileLocations } from '../../../../branded/src/components/panel/views/FileLocations'
import { Location } from '@sourcegraph/extension-api-types'
import { makeRepoURI } from '../../../../shared/src/util/url'
import { renderMarkdown } from '../../../../shared/src/util/markdown'
import { Link } from 'react-router-dom'

export const ExpSymbolDetailGQLFragment = gql`
    fragment ExpSymbolDetailFields on ExpSymbol {
        text
        url
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

interface Props extends SettingsCascadeProps {
    symbol: ExpSymbolDetailFields

    history: H.History
    location: H.Location
}

export const SymbolDetail: React.FunctionComponent<Props> = ({ symbol, history, location, settingsCascade }) => {
    const hoverParts = symbol.hover?.markdown.text.split('---', 2)
    const hoverSig = hoverParts?.[0]
    const hoverDocumentation = hoverParts?.[1]

    return (
        <div>
            <style>
                {
                    '.markdown pre code { font-size: 18px; line-height: 26px; } .markdown pre { margin-bottom: 0; white-space: pre-wrap; }'
                }
            </style>
            <section id="doc">
                {hoverSig && (
                    <Markdown dangerousInnerHTML={renderMarkdown(hoverSig)} history={history} className="mt-3 mx-3" />
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

                {hoverDocumentation && (
                    <Markdown
                        dangerousInnerHTML={renderMarkdown(hoverDocumentation)}
                        history={history}
                        className="m-3 pt-3"
                    />
                )}
            </section>
            {symbol.references.nodes.length > 1 && (
                <section id="refs" className="mt-2">
                    <h2 className="mt-0 mx-3 mb-0 h4">Examples</h2>
                    <style>
                        {
                            'td.line { display: none; } .code-excerpt .code { padding-left: 0.25rem !important; } .result-container__header { display: none; } .result-container { border: solid 1px var(--border-color) !important; border-width: 1px !important; margin: 1rem; }'
                        }
                    </style>
                    <FileLocations
                        location={location}
                        locations={of(
                            symbol.references.nodes.slice(1, 4).map<Location>(reference => ({
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
            )}
        </div>
    )
}

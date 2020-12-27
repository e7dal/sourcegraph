package graphqlbackend

import (
	"context"

	"github.com/sourcegraph/sourcegraph/cmd/frontend/graphqlbackend/graphqlutil"
)

func (r *GitTreeEntryResolver) ExpSymbols(ctx context.Context) (ExpSymbolConnection, error) {
	return ExpSymbolConnection{}, nil
}

type ExpSymbolConnection []*ExpSymbol

func (c ExpSymbolConnection) Nodes() []*ExpSymbol             { return c }
func (c ExpSymbolConnection) TotalCount() int32               { return int32(len(c)) }
func (c ExpSymbolConnection) PageInfo() *graphqlutil.PageInfo { return graphqlutil.HasNextPage(false) }

type ExpSymbol struct{}

func (r *ExpSymbol) Hover(ctx context.Context) (HoverResolver, error) {
	panic("TODO(sqs)")
}

func (r *ExpSymbol) Location() *locationResolver { panic("TODO(sqs)") }

func (r *ExpSymbol) URL(ctx context.Context) (string, error) { panic("TODO(sqs)") }

func (r *ExpSymbol) CanonicalURL() (string, error) { panic("TODO(sqs)") }

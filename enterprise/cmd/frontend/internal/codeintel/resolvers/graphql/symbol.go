package graphql

import (
	"context"

	gql "github.com/sourcegraph/sourcegraph/cmd/frontend/graphqlbackend"
	"github.com/sourcegraph/sourcegraph/enterprise/cmd/frontend/internal/codeintel/resolvers"
)

type SymbolResolver struct {
	symbol resolvers.AdjustedSymbol
}

func NewSymbolResolver(symbol resolvers.AdjustedSymbol) gql.SymbolResolver {
	return &SymbolResolver{
		symbol: symbol,
	}
}

func (r *SymbolResolver) Moniker() gql.MonikerResolver {
	panic("TODO")
}

func (r *SymbolResolver) Definitions(ctx context.Context) (gql.LocationConnectionResolver, error) {
	panic("TODO")
}

func (r *SymbolResolver) References(ctx context.Context) (gql.LocationConnectionResolver, error) {
	panic("TODO")
}

func (r *SymbolResolver) Hover(context.Context) (gql.HoverResolver, error) { panic("TODO") }

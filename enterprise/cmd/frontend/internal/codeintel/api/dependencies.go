package api

import (
	"context"
	"strings"

	"github.com/inconshreveable/log15"
	"github.com/opentracing/opentracing-go/log"
	"github.com/pkg/errors"
	store "github.com/sourcegraph/sourcegraph/enterprise/internal/codeintel/stores/dbstore"
	"github.com/sourcegraph/sourcegraph/enterprise/internal/codeintel/stores/lsifstore"
	"github.com/sourcegraph/sourcegraph/internal/observation"
)

type ResolvedDependency struct {
	Dump       store.Dump
	Dependency lsifstore.PackageInformationData
}

// Dependencies returns the dependencies for documents with the given path prefix.
func (api *CodeIntelAPI) Dependencies(ctx context.Context, prefix string, uploadID, limit, offset int) (_ []ResolvedDependency, _ int, err error) {
	ctx, endObservation := api.operations.hover.With(ctx, &err, observation.Args{LogFields: []log.Field{
		log.String("prefix", prefix),
		log.Int("uploadID", uploadID),
		log.Int("limit", limit),
		log.Int("offset", offset),
	}})
	defer endObservation(1, observation.Args{})

	dump, exists, err := api.dbStore.GetDumpByID(ctx, uploadID)
	if err != nil {
		return nil, 0, errors.Wrap(err, "store.GetDumpByID")
	}
	if !exists {
		return nil, 0, ErrMissingDump
	}

	pathInBundle := strings.TrimPrefix(prefix, dump.Root)
	packageInformations, totalCount, err := api.lsifStore.PackageInformations(ctx, dump.ID, pathInBundle, offset, limit)
	if err != nil {
		if err == lsifstore.ErrNotFound {
			log15.Warn("Bundle does not exist")
			return nil, 0, nil
		}
		return nil, 0, errors.Wrap(err, "bundleClient.PackageInformations")
	}

	return resolveDependenciesWithDump(dump, packageInformations), totalCount, nil
}

func resolveDependenciesWithDump(dump store.Dump, packageInformations []lsifstore.PackageInformationData) []ResolvedDependency {
	var resolvedDependencies []ResolvedDependency
	for _, packageInformation := range packageInformations {
		// TODO(sqs)
		// packageInformation.Path = dump.Root + packageInformation.Path
		resolvedDependencies = append(resolvedDependencies, ResolvedDependency{
			Dump:       dump,
			Dependency: packageInformation,
		})
	}

	return resolvedDependencies
}

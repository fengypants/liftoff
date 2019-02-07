import React from "react";
import Airtable from "airtable";
import PropTypes from "prop-types";
import _ from "underscore";

import Index from "./components/Index";

export default class IndexPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = { rows: null, pagination: null };
  }

  componentDidMount() {
    const { currentPage } = this.props;

    const that = this;
    // nested arrays for pagination purposes
    const allRows = [[]];
    let currentRow = 1;

    const base = new Airtable({
      apiKey: process.env.AIRTABLE_API_KEY
    }).base(process.env.BASE_ID);

    (process.env.METATABLE_NAME
      ? base(process.env.METATABLE_NAME)
          .select()
          .firstPage()
      : Promise.resolve()
    ).then(result => {
      that.setState({ metadata: result && result[0] && result[0].fields });

      base(process.env.TABLE_NAME)
        .select({
          view: process.env.VIEW
        })
        .eachPage(
          function page(records, fetchNextPage) {
            records.forEach(row => {
              if (currentRow > 10) {
                currentRow = 1;
                allRows.push([]);
              }
              const fieldsArray = _.map(row.fields, (value, name) => ({
                name,
                value
              }));

              const fieldOrderMapped = process.env.FIELD_ORDER
                ? _.object(
                    process.env.FIELD_ORDER.split(",").map((field, idx) => [
                      field,
                      idx
                    ])
                  )
                : null;
              const fields = fieldOrderMapped
                ? _.sortBy(fieldsArray, field => fieldOrderMapped[field.name])
                : fieldsArray;

              allRows[allRows.length - 1].push({
                ...row,
                fields
              });
              currentRow += 1;
            });

            // calls page function again while there are still pages left
            fetchNextPage();
          },
          err => {
            if (err) {
              console.error(err);
            }
            const backPage = currentPage > 1 ? currentPage - 1 : null;
            const nextPage =
              currentPage < allRows.length ? currentPage + 1 : null;

            that.setState({
              rows: allRows,
              pagination: {
                back: backPage ? `/dist/page/${backPage}` : null,
                next: nextPage ? `/dist/page/${nextPage}` : null
              }
            });
          }
        );
    });
  }

  componentWillReceiveProps(nextProps) {
    const { currentPage } = this.props;
    const { currentPage: newPage } = nextProps;
    const { rows } = this.state;
    if (newPage !== currentPage) {
      const backPage = newPage > 1 ? newPage - 1 : null;
      const nextPage = newPage < rows.length ? newPage + 1 : null;

      this.setState({
        pagination: {
          back: backPage ? `/dist/page/${backPage}` : null,
          next: nextPage ? `/dist/page/${nextPage}` : null
        }
      });
    }
  }

  render() {
    const { rows, pagination, metadata } = this.state;
    const { currentPage } = this.props;

    return rows ? (
      <div>
        <Index
          rows={rows[currentPage - 1]}
          metadata={metadata}
          pagination={pagination}
        />
      </div>
    ) : (
      <div />
    );
  }
}

IndexPage.propTypes = {
  currentPage: PropTypes.number
};

IndexPage.defaultProps = {
  currentPage: 1
};
